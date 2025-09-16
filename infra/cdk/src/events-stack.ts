import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';

export class EventsStack extends Stack {
  public readonly bus: EventBus;
  public readonly dlQueues: Queue[];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Allow CDK to auto-name the bus (per AGENTS.md: avoid explicit names)
    this.bus = new EventBus(this, 'EventBus');

    // Create a general DLQ for event processing failures
    const generalDlq = new Queue(this, 'EventProcessingDLQ');
    this.dlQueues = [generalDlq];

    new CfnOutput(this, 'EventBusArn', { value: this.bus.eventBusArn });
    new CfnOutput(this, 'EventBusName', { value: this.bus.eventBusName });
  }
}
