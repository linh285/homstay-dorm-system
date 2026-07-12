import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      'postgresql://homestay:homestay_password@localhost:5432/homestay_dorm',
    ),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  JWT_SECRET: z
    .string()
    .min(32)
    .default('development-only-jwt-secret-change-me-12345'),
});

export const env = envSchema.parse(process.env);
