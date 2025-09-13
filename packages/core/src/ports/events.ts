import type { EventEnvelope } from '@ayeldo/types';

export interface IEventPublisher {
  publish<TType extends string, TPayload extends object>(event: EventEnvelope<TType, TPayload>): Promise<void>;
}

