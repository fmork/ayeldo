/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import {
  Dashboard,
  GraphWidget,
  Metric,
  SingleValueWidget,
  TextWidget,
  Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
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

    // Add dashboard title and description
    this.dashboard.addWidgets(
      new TextWidget({
        markdown: `# Ayeldo Photo Ordering System Dashboard\n\nEnvironment: **${this.stackName}**\n\nThis dashboard provides real-time monitoring for the Ayeldo photo ordering platform.`,
        width: 24,
        height: 3,
      }) as any,
    );

    // API Gateway metrics (if available)
    if (props.apiGatewayId) {
      this.dashboard.addWidgets(
        new TextWidget({
          markdown: '## API Gateway Metrics',
          width: 24,
          height: 1,
        }) as any,
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'API Gateway Requests',
          left: [
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Count',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Sum',
              unit: Unit.COUNT,
            }),
          ],
          width: 12,
          height: 6,
        }) as any,
        new GraphWidget({
          title: 'API Gateway Latency',
          left: [
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Latency',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Average',
              unit: Unit.MILLISECONDS,
            }),
          ],
          right: [
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Latency',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Maximum',
              unit: Unit.MILLISECONDS,
            }),
          ],
          width: 12,
          height: 6,
        }) as any,
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'API Gateway Errors',
          left: [
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '4XXError',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Sum',
              unit: Unit.COUNT,
            }),
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '5XXError',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Sum',
              unit: Unit.COUNT,
            }),
          ],
          width: 12,
          height: 6,
        }) as any,
        new SingleValueWidget({
          title: 'API Requests (1h)',
          metrics: [
            new Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Count',
              dimensionsMap: {
                ApiId: props.apiGatewayId,
              },
              statistic: 'Sum',
            }),
          ],
          width: 12,
          height: 6,
        }) as any,
      );
    }

    // Lambda function metrics (if available)
    if (props.lambdaFunctions && props.lambdaFunctions.length > 0) {
      this.dashboard.addWidgets(
        new TextWidget({
          markdown: '## Lambda Function Metrics',
          width: 24,
          height: 1,
        }) as any,
      );

      // Lambda invocations overview
      const invocationMetrics = props.lambdaFunctions.map(
        (fn) =>
          new Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: {
              FunctionName: fn.functionName,
            },
            statistic: 'Sum',
            unit: Unit.COUNT,
          }),
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'Lambda Invocations',
          left: invocationMetrics,
          width: 12,
          height: 6,
        }) as any,
      );

      // Lambda errors
      const errorMetrics = props.lambdaFunctions.map(
        (fn) =>
          new Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: {
              FunctionName: fn.functionName,
            },
            statistic: 'Sum',
            unit: Unit.COUNT,
          }),
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'Lambda Errors',
          left: errorMetrics,
          width: 12,
          height: 6,
        }) as any,
      );

      // Lambda duration and throttles
      const durationMetrics = props.lambdaFunctions.map(
        (fn) =>
          new Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: {
              FunctionName: fn.functionName,
            },
            statistic: 'Average',
            unit: Unit.MILLISECONDS,
          }),
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'Lambda Duration (Average)',
          left: durationMetrics,
          width: 12,
          height: 6,
        }) as any,
        new GraphWidget({
          title: 'Lambda Throttles',
          left: props.lambdaFunctions.map(
            (fn) =>
              new Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Throttles',
                dimensionsMap: {
                  FunctionName: fn.functionName,
                },
                statistic: 'Sum',
                unit: Unit.COUNT,
              }),
          ),
          width: 12,
          height: 6,
        }) as any,
      );
    }

    // Dead Letter Queue metrics (if available)
    if (props.dlQueues && props.dlQueues.length > 0) {
      this.dashboard.addWidgets(
        new TextWidget({
          markdown: '## Dead Letter Queue Monitoring',
          width: 24,
          height: 1,
        }) as any,
      );

      const dlqMetrics = props.dlQueues.map(
        (queue) =>
          new Metric({
            namespace: 'AWS/SQS',
            metricName: 'ApproximateNumberOfVisibleMessages',
            dimensionsMap: {
              QueueName: queue.queueName,
            },
            statistic: 'Maximum',
            unit: Unit.COUNT,
          }),
      );

      this.dashboard.addWidgets(
        new GraphWidget({
          title: 'Dead Letter Queue Message Count',
          left: dlqMetrics,
          width: 12,
          height: 6,
        }) as any,
        new SingleValueWidget({
          title: 'DLQ Messages',
          metrics: dlqMetrics,
          width: 12,
          height: 6,
        }) as any,
      );
    }

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
