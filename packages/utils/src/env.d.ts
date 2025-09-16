import type { z } from 'zod';
export declare const baseEnvSchema: z.ZodObject<
  {
    NODE_ENV: z.ZodDefault<z.ZodEnum<['development', 'test', 'production']>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<['debug', 'info', 'warn', 'error']>>;
    AWS_REGION: z.ZodDefault<z.ZodString>;
    SERVICE_NAME: z.ZodDefault<z.ZodString>;
  },
  'strip',
  z.ZodTypeAny,
  {
    NODE_ENV: 'development' | 'test' | 'production';
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    AWS_REGION: string;
    SERVICE_NAME: string;
  },
  {
    NODE_ENV?: 'development' | 'test' | 'production' | undefined;
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error' | undefined;
    AWS_REGION?: string | undefined;
    SERVICE_NAME?: string | undefined;
  }
>;
export type BaseEnv = z.infer<typeof baseEnvSchema>;
export declare function loadEnv(): BaseEnv;
export declare function loadEnv<TShape extends z.ZodRawShape>(
  schema: z.ZodObject<TShape>,
): z.infer<z.ZodObject<TShape>> & BaseEnv;
//# sourceMappingURL=env.d.ts.map
