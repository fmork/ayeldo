export interface RequestContext {
    readonly requestId: string;
}
export declare function runWithRequestContext<T>(requestId: string, fn: () => T): T;
export declare function getRequestContext(): RequestContext | undefined;
//# sourceMappingURL=requestContext.d.ts.map