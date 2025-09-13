import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { IEventPublisher } from '@ayeldo/core';
import type { EventEnvelope } from '@ayeldo/types';

export interface EventBridgePublisherProps {
  readonly client: EventBridgeClient;
  readonly eventBusName: string;
  readonly source?: string;
}

export class EventBridgePublisher implements IEventPublisher {
  private readonly client: EventBridgeClient;
  private readonly eventBusName: string;
  private readonly source: string;

  constructor(props: EventBridgePublisherProps) {
    this.client = props.client;
    this.eventBusName = props.eventBusName;
    this.source = props.source ?? 'ayeldo.domain';
  }

  async publish<TType extends string, TPayload extends object>(event: EventEnvelope<TType, TPayload>): Promise<void> {
    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: this.eventBusName,
          Source: this.source,
          DetailType: event.type,
          Time: new Date(event.occurredAt),
          Detail: JSON.stringify(event),
        },
      ],
    });
    await this.client.send(command);
  }
}

