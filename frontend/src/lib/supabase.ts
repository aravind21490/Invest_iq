import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing mandatory Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
    "Please set them in your .env.local file or Vercel Environment Variables dashboard."
  );
}

/**
 * Server-side Supabase client initialized with the SERVICE_ROLE key.
 * Used exclusively inside server-side route handlers (src/app/api/*).
 * Never import or reference this client from client-side components ("use client").
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
