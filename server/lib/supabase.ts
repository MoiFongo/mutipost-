import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Supabase features will not work."
  );
}

// Service role client — bypasses RLS, used server-side only
export const supabaseAdmin = createClient(
  supabaseUrl || "http://localhost",
  supabaseServiceKey || "missing-key"
);

// Create a client scoped to a specific user's JWT
export function supabaseForUser(jwt: string) {
  return createClient(
    supabaseUrl || "http://localhost",
    process.env.SUPABASE_ANON_KEY || "missing-key",
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    }
  );
}
