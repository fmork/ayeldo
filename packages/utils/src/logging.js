import pino from 'pino';
import { PinoLogWriter } from './pinoLogWriter';
export function createRootLogger(serviceName, level = 'info') {
    const base = pino({ level, base: { service: serviceName } });
    return new PinoLogWriter(base);
}
export function withRequestId(logger, requestId) {
    return logger.createChild({ requestId });
}
//# sourceMappingURL=logging.js.map