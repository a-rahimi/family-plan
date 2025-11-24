import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("file:./prisma/dev.db"),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_PROJECT_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Family Plan"),
  NEXT_PUBLIC_CALENDAR_IFRAME_URL: z.string().url().optional(),
});

type AppEnv = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_CALENDAR_IFRAME_URL: process.env.NEXT_PUBLIC_CALENDAR_IFRAME_URL,
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Failed to parse environment variables. Check .env configuration.");
}

export const env: AppEnv = parsedEnv.data;
export const isProduction = env.NODE_ENV === "production";

