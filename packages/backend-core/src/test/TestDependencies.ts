import { TestLogWriter } from './TestLogWriter';

export const testLogWriter = new TestLogWriter();
export const runTest = (name: string, action: () => Promise<unknown>): void => {
  test(name, async () => {
    try {
      await action();
    } catch (error) {
      // eslint-disable-next-line no-console
      testLogWriter.flushLogs(console.info);
      throw error;
    }
    testLogWriter.clearLogs();
  });
};
