import { z } from "zod";

/**
 * Single source of truth for every environment variable used across the platform.
 * Nothing in the codebase should read process.env directly — always import the
 * validated `env` object from this package instead.
 */
export const envSchema = z.object({
  // --- Core ---
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("business-os"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().min(1).default("0.0.0.0"),

  // --- Security ---
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  QR_TOKEN_HMAC_SECRET: z.string().min(32, "QR_TOKEN_HMAC_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),

  // --- PostgreSQL ---
  POSTGRES_HOST: z.string().min(1).default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  DATABASE_URL: z.string().url().optional(),

  // --- Redis ---
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // --- MinIO ---
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_BUCKET_NAME: z.string().min(1).default("business-os"),

  // --- Public URLs ---
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_ADMIN_URL: z.string().url().default("http://localhost:3001"),

  // --- CORS ---
  CORS_ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:3000,http://localhost:3001"),

  // --- Rate limiting ---
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // --- Notifications (wired in a later phase) ---
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // --- Logging ---
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;
