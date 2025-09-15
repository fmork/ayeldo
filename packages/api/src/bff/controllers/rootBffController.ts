/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicController } from '@fmork/backend-core/dist/controllers';
import type { HttpRouter } from '@fmork/backend-core/dist/controllers/http';
import type { ILogWriter } from '@fmork/backend-core/dist/logging';

export interface RootBffControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
}

export class RootBffController extends PublicController {
  public constructor(props: RootBffControllerProps) {
    super(props.baseUrl, props.logWriter);
  }

  public initialize(): HttpRouter {
    // GET / — return current server time in ISO format as JSON
    this.addGet('/', async (_req, res) => {
      const nowIso = new Date().toISOString();
      // Use json() to return a simple payload
      (res as any).json?.({ now: nowIso }) ??
        (res as any).status?.(200)?.end?.(JSON.stringify({ now: nowIso }));
    });

    return this.getRouter();
  }
}
