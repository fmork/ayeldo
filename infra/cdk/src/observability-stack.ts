import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Dashboard } from 'aws-cdk-lib/aws-cloudwatch';
import type { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import type { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

export interface ObservabilityStackProps extends StackProps {
  readonly apiGatewayId?: string;
  readonly lambdaFunctions?: LambdaFunction[];
  readonly dlQueues?: Queue[];
}

export class ObservabilityStack extends Stack {
  public readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    this.dashboard = new Dashboard(this, 'AyeldoDashboard', {
      dashboardName: `Ayeldo-${this.stackName}`,
    });

    // Output dashboard URL for easy access
    new CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    // Output information about what would be monitored
    if (props.apiGatewayId) {
      new CfnOutput(this, 'ApiGatewayId', {
        value: props.apiGatewayId,
        description: 'API Gateway being monitored',
      });
    }

    if (props.lambdaFunctions && props.lambdaFunctions.length > 0) {
      new CfnOutput(this, 'LambdaFunctions', {
        value: props.lambdaFunctions.map((fn) => fn.functionName).join(', '),
        description: 'Lambda functions being monitored',
      });
    }

    if (props.dlQueues && props.dlQueues.length > 0) {
      new CfnOutput(this, 'DLQueues', {
        value: props.dlQueues.map((q) => q.queueName).join(', '),
        description: 'DLQ queues being monitored',
      });
    }
  }
}
