import ServerlessHttp from 'serverless-http';
import { server, logWriter } from '../../init/ReferenceApiInit';

logWriter.info('Loading reference api handler');

const app = server.getExpressApp();

export const main = ServerlessHttp(app);

