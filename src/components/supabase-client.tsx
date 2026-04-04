import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

// Graceful fallback if Vercel doesn't have the secret keys so the whole app doesn't crash
const isReady = typeof projectId === "string" && projectId.length > 5 && typeof publicAnonKey === "string" && publicAnonKey.length > 10;

export const supabase = isReady ? createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  { auth: { persistSession: true, autoRefreshToken: true } }
) : {} as any;
