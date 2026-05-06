import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("plant-images"),
  PLANTNET_API_KEY: z.string().min(1),
  FLORA_API_KEY: z.string().min(1),
  FLORA_API_BASE_URL: z.string().url().default("https://api.floraapi.com"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  SESSION_SECRET: z.string().min(32),
  MAX_IMAGE_MB: z.coerce.number().default(10),
  SCAN_RATE_LIMIT_PER_HOUR: z.coerce.number().default(20),
});

function loadEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables: ${missing}`);
  }
  return result.data;
}

// Lazy singleton — avoids parse cost at import time during build
let _env: z.infer<typeof schema> | undefined;
export function env() {
  if (!_env) _env = loadEnv();
  return _env;
}
