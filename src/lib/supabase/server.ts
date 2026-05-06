import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let _client: TypedSupabaseClient | undefined;

export function supabase(): TypedSupabaseClient {
  if (!_client) {
    const e = env();
    _client = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _client;
}
