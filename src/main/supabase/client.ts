import { createClient } from "@supabase/supabase-js";
import { safeStorage } from "electron";
import Store from "electron-store";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in project root
const envPath = path.join(__dirname, "../../../.env");
loadEnv({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

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

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // We handle session storage ourselves
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
