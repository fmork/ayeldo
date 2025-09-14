import { Duration, Stack } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface AnalyticsStackProps extends StackProps {
  readonly table: Table;
  readonly eventBus: EventBus;
}

export class AnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props: AnalyticsStackProps) {
    super(scope, id, props);

    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);

    // Prebuilt artifact path for analytics consumer
    const assetsDir = path.join(__dirnameLocal, '../../assets/lambdas/services-analytics');

    const fn = new lambda.Function(this, 'AnalyticsConsumer', {
      code: lambda.Code.fromAsset(assetsDir),
      handler: 'index.main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(15),
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
