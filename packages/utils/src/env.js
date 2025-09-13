import { z } from 'zod';
export const baseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    AWS_REGION: z.string().min(1).default('us-east-1'),
    SERVICE_NAME: z.string().min(1).default('unknown'),
});
export function loadEnv(schema) {
    const merged = schema && schema._def && 'shape' in schema
        ? baseEnvSchema.merge(schema)
        : baseEnvSchema;
    const parsed = merged.parse(process.env);
    return parsed;
}
//# sourceMappingURL=env.js.map