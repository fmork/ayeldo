import type { EventEnvelope } from '@ayeldo/types';
import type { IStatsRepo } from '@ayeldo/core';
import { PinoLogWriter } from '@ayeldo/utils';

export interface AnalyticsConsumerProps {
  readonly statsRepo: IStatsRepo;
  readonly logger: PinoLogWriter;
}

export class AnalyticsConsumer {
  private readonly stats: IStatsRepo;
  private readonly logger: PinoLogWriter;

  constructor(props: AnalyticsConsumerProps) {
    this.stats = props.statsRepo;
    this.logger = props.logger;
  }

  async handle(event: EventEnvelope<string, any>): Promise<void> {
    const first = await this.stats.ensureIdempotent(event.id, 7 * 24 * 3600);
    if (!first) {
      this.logger.debug(`analytics: duplicate event ${event.id}, skipping`);
      return;
    }
    try {
      switch (event.type) {
        case 'ViewRecorded': {
          const subjectId: string | undefined = (event.payload && (event.payload.imageId ?? event.payload.albumId)) as
            | string
            | undefined;
          if (subjectId) {
            await this.stats.incrementMetric('views', {
              tenantId: event.tenantId,
              subjectId,
              occurredAtIso: event.occurredAt,
              delta: 1,
            });
          }
          break;
        }
        case 'DownloadRecorded': {
          const subjectId: string | undefined = (event.payload && event.payload.imageId) as string | undefined;
          if (subjectId) {
            await this.stats.incrementMetric('downloads', {
              tenantId: event.tenantId,
              subjectId,
              occurredAtIso: event.occurredAt,
              delta: 1,
            });
          }
          break;
        }
        case 'OrderPaid': {
          const subjectId: string = (event.payload?.orderId as string | undefined) ?? 'aggregate';
          await this.stats.incrementMetric('buys', {
            tenantId: event.tenantId,
            subjectId,
            occurredAtIso: event.occurredAt,
            delta: 1,
          });
          break;
        }
        default: {
          this.logger.debug(`analytics: ignoring event type ${event.type}`);
          break;
        }
      }
    } catch (err) {
      const e = err as Error;
      this.logger.error(`analytics: failed processing ${event.type}`, e);
      throw e;
    }
  }
}

