import type { StackProps } from 'aws-cdk-lib';
import { Duration, Stack } from 'aws-cdk-lib';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import path from 'path';

export interface AnalyticsStackProps extends StackProps {
  readonly table: Table;
  readonly eventBus: EventBus;
}

export class AnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props: AnalyticsStackProps) {
    super(scope, id, props);

    const __dirnameLocal = __dirname;

    // Prebuilt artifact path for analytics consumer
    const assetsDir = path.resolve(__dirnameLocal, '../assets/lambdas/services-analytics');

    const fn = new lambda.Function(this, 'AnalyticsConsumer', {
      code: lambda.Code.fromAsset(assetsDir),
      handler: 'index.main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(15),
      logRetention: 30,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: props.table.tableName,
      },
    });

    // Permissions: function can read/write stats table
    props.table.grantReadWriteData(fn);

    // EventBridge rule to route relevant events to analytics consumer
    const rule = new Rule(this, 'AnalyticsRule', {
      eventBus: props.eventBus,
      eventPattern: {
        detailType: ['ViewRecorded', 'DownloadRecorded', 'OrderPaid'],
      },
    });

    // DLQ for failed deliveries from EventBridge to Lambda
    // Let CDK auto-name the DLQ (per AGENTS.md)
    const dlq = new Queue(this, 'AnalyticsTargetDLQ');

    rule.addTarget(new LambdaFunction(fn, { retryAttempts: 2, deadLetterQueue: dlq }));
  }
}
