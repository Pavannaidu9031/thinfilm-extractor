// Supabase browser client (used for Google sign-in via Supabase Auth).
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are public values — the anon key
// is designed to be shipped to the browser; no secret lives here.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced in the console during local dev if the .env vars are missing.
  console.warn(
    "Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in web/.env"
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the OAuth redirect back to the app
  },
});

// Keep the current access token in a module-level variable so api.js can read
// it synchronously (needed for the XHR upload, which can't await a Promise).
let currentAccessToken = null;

supabase.auth.getSession().then(({ data }) => {
  currentAccessToken = data.session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentAccessToken = session?.access_token ?? null;
});

export function getAccessToken() {
  return currentAccessToken;
}
