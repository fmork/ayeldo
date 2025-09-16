import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
}

const als = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return als.run({ requestId }, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}
