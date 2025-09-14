import { Stack, CfnOutput } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { EventBus } from 'aws-cdk-lib/aws-events';

export class EventsStack extends Stack {
  public readonly bus: EventBus;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Allow CDK to auto-name the bus (per AGENTS.md: avoid explicit names)
    this.bus = new EventBus(this, 'EventBus');

    new CfnOutput(this, 'EventBusArn', { value: this.bus.eventBusArn });
    new CfnOutput(this, 'EventBusName', { value: this.bus.eventBusName });
  }
}
