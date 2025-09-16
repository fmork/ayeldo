import { runWithRequestContext } from '@ayeldo/utils';
import AWSXRay from 'aws-xray-sdk-core';
import cookieParser from 'cookie-parser';
import ServerlessHttp from 'serverless-http';
import { logWriter, server } from '../../init/ApiInit';

// Enable X-Ray tracing
AWSXRay.config([AWSXRay.plugins.ECSPlugin, AWSXRay.plugins.EC2Plugin]);

logWriter.info('Loading API handler');

const app = server.getExpressApp();

// Attach cookie parser and requestId middleware early. cookie-parser must
// run before any code that reads req.cookies (our ExpressRequestAdapter).
app.use(cookieParser());

// Debug middleware: print all request headers and parsed cookies
app.use((req: unknown, _res: unknown, next: unknown) => {
  try {
    // Minimal Request-like shape for logging to avoid import() in types
    const r = req as {
      headers?: Record<string, string | string[] | undefined>;
      cookies?: Record<string, string>;
    };
    // Log all request headers
    logWriter.info(`REQ HEADERS: ${JSON.stringify(r.headers ?? {})}`);
    // Log parsed cookies (cookie-parser populates req.cookies)
    logWriter.info(`REQ COOKIES: ${JSON.stringify(r.cookies ?? {})}`);
  } catch (e) {
    // Don't break the pipeline if logging fails
    logWriter.warn(`Failed to log headers/cookies in debug middleware: ${(e as Error).message}`);
  }
  const n = next as () => void;
  n();
});

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
