import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import {
  Distribution,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachePolicy,
  OriginAccessIdentity,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

export class CoreStack extends Stack {
  public readonly table: Table;
  public readonly webBucket: Bucket;
  public readonly webDistribution: Distribution;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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

    new CfnOutput(this, 'TableName', { value: this.table.tableName });
    new CfnOutput(this, 'WebBucketName', { value: this.webBucket.bucketName });
    new CfnOutput(this, 'WebDistributionDomainName', { value: this.webDistribution.distributionDomainName });
    new CfnOutput(this, 'WebDistributionId', { value: this.webDistribution.distributionId });
  }
}
