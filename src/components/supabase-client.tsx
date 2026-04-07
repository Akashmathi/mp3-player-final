import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey, supabaseUrlString } from "../utils/supabase/info";

// Graceful fallback if Vercel doesn't have the secret keys so the whole app doesn't crash
const isReady = typeof projectId === "string" && projectId.length > 5 && typeof publicAnonKey === "string" && publicAnonKey.length > 10 && typeof supabaseUrlString === "string" && supabaseUrlString.startsWith("http");

if (!isReady) {
  console.warn(
    "Supabase client is not fully configured. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined.",
    { projectId, publicAnonKey, supabaseUrlString },
  );
}

export const supabase = isReady ? createClient(
  supabaseUrlString,
  publicAnonKey,
  { auth: { persistSession: true, autoRefreshToken: true } }
) : {} as any;
