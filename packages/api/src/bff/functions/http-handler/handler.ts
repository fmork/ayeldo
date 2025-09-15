import ServerlessHttp from 'serverless-http';
import { logWriter, server } from '../../../init/ApiInit';

logWriter.info('Loading unified API+BFF handler');

const app = server.getExpressApp();

export const main = ServerlessHttp(app);
