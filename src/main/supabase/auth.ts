import { supabase, saveSession, loadSession, clearSession } from "./client";
import type { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (data.session) {
    await saveSession(data.session);
  }

  return { user: data.user as AuthUser, error: null };
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (data.session) {
    await saveSession(data.session);
  }

  return { user: data.user as AuthUser, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}

export async function getSession(): Promise<{ user: AuthUser | null; error: string | null }> {
  // First try to restore from secure storage
  const storedSession = await loadSession();
  if (storedSession) {
    const { data, error } = await supabase.auth.setSession(storedSession as Parameters<typeof supabase.auth.setSession>[0]);
    if (error) {
      clearSession();
      return { user: null, error: error.message };
    }
    if (data.session) {
      return { user: data.user as AuthUser, error: null };
    }
  }

  // Check current session
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { user: null, error: error.message };
  }

  if (data.session) {
    await saveSession(data.session);
    return { user: data.session.user as AuthUser, error: null };
  }

  return { user: null, error: null };
}

export type AuthCallback = (user: AuthUser | null) => void;

export function onAuthStateChange(callback: AuthCallback): () => void {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      await saveSession(session);
      callback(session.user as AuthUser);
    } else {
      callback(null);
    }
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export function getCurrentUser(): AuthUser | null {
  // Note: This returns a Promise in newer versions of supabase-js
  // Use getSession() instead which returns a Promise
  return null;
}
