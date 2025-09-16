import { runWithRequestContext } from '@ayeldo/utils';
import AWSXRay from 'aws-xray-sdk-core';
import ServerlessHttp from 'serverless-http';
import { logWriter, server } from '../../init/ApiInit';

// Enable X-Ray tracing
AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.EC2Plugin]);

logWriter.info('Loading API handler');

const app = server.getExpressApp();

// Attach requestId middleware early
app.use((req: unknown, res: unknown, next: unknown) => {
  // Express types are not imported here; keep it minimal and type-safe
  const r = req as { headers?: Record<string, string | string[] | undefined> };
  const w = res as { setHeader?: (name: string, value: string) => void };
  const n = next as () => void;
  const fromHeader = r.headers?.['x-request-id'];
  const id = Array.isArray(fromHeader)
    ? fromHeader[0]
    : (fromHeader as string | undefined) || (Math.random() + 1).toString(36).slice(2);
  if (w.setHeader) w.setHeader('X-Request-Id', id);
  runWithRequestContext(id, () => n());
});

export const main = ServerlessHttp(app);
