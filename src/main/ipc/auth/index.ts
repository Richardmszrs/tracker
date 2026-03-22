import { os } from "@orpc/server";
import { z } from "zod";
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
} from "@/main/supabase/auth";
import { syncEngine } from "@/main/supabase/sync";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authSignIn = os.input(signInSchema).handler(async (opt) => {
  const result = await signInWithEmail(opt.input.email, opt.input.password);
  if (result.user) {
    syncEngine.setUser(result.user);
    // Trigger sync after sign in
    syncEngine.sync().catch((err) =>
      console.error("Sync after sign in failed:", err)
    );
  }
  return result;
});

export const authSignUp = os.input(signUpSchema).handler(async (opt) => {
  const result = await signUpWithEmail(opt.input.email, opt.input.password);
  if (result.user) {
    syncEngine.setUser(result.user);
  }
  return result;
});

export const authSignOut = os.handler(async () => {
  await signOut();
  syncEngine.setUser(null);
  return { success: true };
});

export const authGetUser = os.handler(async () => {
  const { user } = await getSession();
  return { user };
});
