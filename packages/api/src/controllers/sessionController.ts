import type { HttpRouter, ILogWriter } from '@fmork/backend-core';
import { PublicController } from '@fmork/backend-core';
import type { AuthFlowService } from '../services/authFlowService';

export interface SessionControllerProps {
  readonly baseUrl: string;
  readonly logWriter: ILogWriter;
  readonly authFlow: AuthFlowService;
}

export class SessionController extends PublicController {
  private readonly authFlow: AuthFlowService;

  public constructor(props: SessionControllerProps) {
    super(props.baseUrl, props.logWriter);
    this.authFlow = props.authFlow;
  }

  public initialize(): HttpRouter {
    // GET / — minimal profile state
    this.addGet('/', async (req, res) => {
      await this.performRequest(
        () => {
          return this.authFlow.sessionInfo(
            (req as { cookies?: Record<string, string> }).cookies?.['__Host-sid'],
          );
        },
        res,
        (r) => (r.loggedIn ? 200 : 401),
      );
    });

    return this.getRouter();
  }
}
