import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase public environment variables. Expected a Supabase URL and publishable key from the Vercel integration."
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Active advertisements are intentionally public under RLS. Keeping their
// reads on an auth-free client prevents a cached mobile session from changing
// which paid campaigns are visible.
export const publicSupabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storageKey: "neighborly-public-advertisements",
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
