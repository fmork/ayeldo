import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  SERVICE_NAME: z.string().min(1).default('unknown'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function loadEnv(): BaseEnv;
export function loadEnv<TShape extends z.ZodRawShape>(schema: z.ZodObject<TShape>): z.infer<z.ZodObject<TShape>> & BaseEnv;
export function loadEnv(schema?: z.ZodObject<any>): any {
  const merged = schema ? baseEnvSchema.merge(schema) : baseEnvSchema;
  return merged.parse(process.env);
}
