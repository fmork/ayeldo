import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  S3OriginAccessControl,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { AnyPrincipal, Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import fs from 'fs';
import path from 'path';
import type { DomainConfig } from './domain';

export interface CoreStackProps extends StackProps {
  readonly domainConfig?: DomainConfig;
  readonly certificateArn?: string; // from CertStack (us-east-1)
}

export class CoreStack extends Stack {
  public readonly table: Table;
  public readonly webBucket: Bucket;
  public readonly webDistribution: Distribution;

  constructor(scope: Construct, id: string, props?: CoreStackProps) {
    super(scope, id, props);

    const __dirnameLocal = __dirname;

    this.table = new Table(this, 'AppTable', {
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY, // dev default; adjust in prod
    });

    // GSI1: Album tree (parent -> child)
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // NOTE: Images by album also use GSI1 with SK prefixed by IMAGE#

    // Static web hosting bucket (served via CloudFront)
    this.webBucket = new Bucket(this, 'WebBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY, // dev default; adjust in prod
      autoDeleteObjects: true, // dev convenience; remove for prod
      cors: [
        {
          allowedHeaders: ['Authorization'],
          allowedMethods: [HttpMethods.GET],
          allowedOrigins: [`https://${props?.domainConfig?.webHost ?? 'website'}`],
          maxAge: 300,
        },
      ],
    });

    const originAccessControl = new S3OriginAccessControl(this, 'WebDistributionAccessControl', {
      description: `OAC for ${props?.domainConfig?.webHost ?? 'website'}`,
    });

    // Optionally attach custom domain + ACM cert (created in us-east-1 via CertStack)
    const distributionExtraProps =
      props?.domainConfig && props?.certificateArn
        ? {
            certificate: Certificate.fromCertificateArn(
              this,
              'WebCertFromArn',
              props.certificateArn,
            ),
            domainNames: [props.domainConfig.webHost],
          }
        : {};

    this.webDistribution = new Distribution(this, 'WebDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.webBucket, {
          originAccessControl: originAccessControl,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      enableLogging: false,
      comment: 'Web distribution for SPA assets',
      ...distributionExtraProps,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Route53 records for custom domain (A/AAAA alias to CloudFront)
    if (props?.domainConfig) {
      const zone = HostedZone.fromLookup(this, 'WebHostedZone', {
        domainName: props.domainConfig.baseDomain,
      });
      const recordName = props.domainConfig.webHost.replace(
        `.${props.domainConfig.baseDomain}`,
        '',
      );
      new ARecord(this, 'WebAliasA', {
        zone,
        recordName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.webDistribution)),
      });
      new AaaaRecord(this, 'WebAliasAAAA', {
        zone,
        recordName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(this.webDistribution)),
      });
    }

    // Grant CloudFront access to S3 bucket using OAC
    this.webBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
        resources: [this.webBucket.bucketArn, `${this.webBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${this.webDistribution.distributionId}`,
          },
        },
      }),
    );

    // Deny direct access to .env file (excluding CloudFront)
    this.webBucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.DENY,
        principals: [new AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.webBucket.bucketArn}/.env`],
        conditions: {
          StringNotEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${this.webDistribution.distributionId}`,
          },
        },
      }),
    );

    // Deploy SPA build artifacts (if present) to S3 and invalidate CloudFront
    // We intentionally do not set explicit resource names (AGENTS.md)
    const webAssetsDir = path.resolve(__dirnameLocal, '../assets/web');
    if (fs.existsSync(webAssetsDir)) {
      new BucketDeployment(this, 'DeployWebSpa', {
        sources: [Source.asset(webAssetsDir)],
        destinationBucket: this.webBucket,
        distribution: this.webDistribution,
        distributionPaths: ['/*'],
        cacheControl: [
          CacheControl.setPublic(),
          CacheControl.maxAge(Duration.days(365)),
          CacheControl.sMaxAge(Duration.days(365)),
        ],
        prune: true,
      });
    }

    new CfnOutput(this, 'TableName', { value: this.table.tableName });
    new CfnOutput(this, 'WebBucketName', { value: this.webBucket.bucketName });
    new CfnOutput(this, 'WebDistributionDomainName', {
      value: this.webDistribution.distributionDomainName,
    });
    new CfnOutput(this, 'WebDistributionId', { value: this.webDistribution.distributionId });

    // Helpful outputs for computed hostnames when a domain is configured
    if (props?.domainConfig) {
      new CfnOutput(this, 'ComputedWebHost', { value: props.domainConfig.webHost });
      new CfnOutput(this, 'ComputedApiHost', { value: props.domainConfig.apiHost });
      // Backwards-compatible output: the old "BFF" host (now the HTTP API / backend host)
      // Keep the resource value the same (props.domainConfig.bffHost) but present it under
      // a clearer name to avoid the historical 'BFF' acronym in new deployments.
      new CfnOutput(this, 'ComputedBackendHost', { value: props.domainConfig.bffHost });
      new CfnOutput(this, 'ComputedCdnHost', { value: props.domainConfig.cdnHost });
    }
  }
}
