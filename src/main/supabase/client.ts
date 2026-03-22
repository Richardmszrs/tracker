import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeStorage } from "electron";
import Store from "electron-store";

// Environment variables should be loaded automatically by Electron/Vite
// In development, these come from the .env file via Vite's mechanism
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found in environment variables");
}

// Secure session storage using electron-store
const sessionStore = new Store<{ encryptedSession: string | null }>({
  name: "supabase-session",
  defaults: {
    encryptedSession: null,
  },
});

let supabaseInstance: SupabaseClient | null = null;

function initializeSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anonymous key are required. Check your .env file.");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // We handle session storage ourselves
    },
  });

  return supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  return initializeSupabase();
}

// For backward compatibility, also export supabase as a function call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = new Proxy({}, {
  get(_target, prop) {
    return (initializeSupabase() as any)[prop];
  },
});

// Save session securely
export async function saveSession(session: unknown) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("Safe storage encryption not available, storing session in plaintext");
    sessionStore.set("encryptedSession", JSON.stringify(session));
    return;
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(session));
  sessionStore.set("encryptedSession", encrypted.toString("base64"));
}

// Load and decrypt session
export async function loadSession(): Promise<unknown | null> {
  const encrypted = sessionStore.get("encryptedSession");
  if (!encrypted) return null;

  if (!safeStorage.isEncryptionAvailable()) {
    try {
      return JSON.parse(encrypted);
    } catch {
      return null;
    }
  }

  try {
    const buffer = Buffer.from(encrypted, "base64");
    const decrypted = safeStorage.decryptString(buffer);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt session:", error);
    return null;
  }
}

// Clear session
export function clearSession() {
  sessionStore.set("encryptedSession", null);
}
