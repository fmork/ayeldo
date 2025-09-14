import ServerlessHttp from 'serverless-http';
import { server, logWriter } from '../../init/BffInit';

logWriter.info('Loading BFF handler');

const app = server.getExpressApp();

export const main = ServerlessHttp(app);

