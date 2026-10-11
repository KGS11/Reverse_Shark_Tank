import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role admin client.
 * CAUTION: This client bypasses Row Level Security.
 * It MUST only be used in server-side execution contexts (Server Actions, Route Handlers, scripts)
 * and NEVER exposed to or invoked by client-side code.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in server environment."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
