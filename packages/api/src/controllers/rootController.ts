/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpRouter, ILogWriter } from '@ayeldo/backend-core';
import { PublicController } from '@ayeldo/backend-core';

export interface RootControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
}

export class RootController extends PublicController {
  public constructor(props: RootControllerProps) {
    super(props.baseUrl, props.logWriter);
  }

  public initialize(): HttpRouter {
    // GET / — return current server time in ISO format as JSON
    this.addGet('/', async (_req, res) => {
      await this.performRequest(async () => ({ serverTime: new Date().toISOString() }), res);
    });

    return this.getRouter();
  }
}

// Legacy export for compatibility
export const RootBffController = RootController as unknown as typeof RootController;
