import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DomainConfig } from './domain';

export interface CoreStackProps extends StackProps {
  readonly domainConfig?: DomainConfig;
}

export class CoreStack extends Stack {
  public readonly table: Table;
  public readonly webBucket: Bucket;
  public readonly webDistribution: Distribution;

  constructor(scope: Construct, id: string, props?: CoreStackProps) {
    super(scope, id, props);

    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);

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
    });

    const oai = new OriginAccessIdentity(this, 'WebOAI');
    this.webBucket.grantRead(oai);

    this.webDistribution = new Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: new S3Origin(this.webBucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      enableLogging: false,
      comment: 'Web distribution for SPA assets',
    });

    // Deploy SPA build artifacts (if present) to S3 and invalidate CloudFront
    // We intentionally do not set explicit resource names (AGENTS.md)
    const webAssetsDir = path.join(__dirnameLocal, '../../assets/web');
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
      new CfnOutput(this, 'ComputedBffHost', { value: props.domainConfig.bffHost });
      new CfnOutput(this, 'ComputedCdnHost', { value: props.domainConfig.cdnHost });
    }
  }
}
