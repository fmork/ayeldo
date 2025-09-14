import ServerlessHttp from 'serverless-http';
import { server, logWriter } from '../../init/ApiInit';

logWriter.info('Loading API handler');

const app = server.getExpressApp();

export const main = ServerlessHttp(app);

