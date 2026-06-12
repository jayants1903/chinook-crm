import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let cachedAuthClient: SupabaseClient | null = null;

function getExternalSupabaseUrl() {
  const url = process.env.EXTERNAL_SUPABASE_URL;
  if (!url) {
    throw new Error("EXTERNAL_SUPABASE_URL is not configured");
  }
  return url;
}

function getExternalSupabaseServiceRoleKey() {
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return key;
}

function getExternalSupabaseAuthKey() {
  return (
    process.env.EXTERNAL_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getExternalSupabase(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(getExternalSupabaseUrl(), getExternalSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function getExternalSupabaseAuth(): SupabaseClient {
  if (cachedAuthClient) return cachedAuthClient;
  const key = getExternalSupabaseAuthKey();
  if (!key) {
    throw new Error(
      "EXTERNAL_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY must be configured for Supabase Auth login",
    );
  }
  cachedAuthClient = createClient(getExternalSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cachedAuthClient;
}
