import path from "node:path";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config
export default defineConfig(({ mode }) => {
  // Load env file for this mode
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
    define: {
      // Expose env vars to the built bundle
      "process.env.SUPABASE_URL": JSON.stringify(env.SUPABASE_URL || ""),
      "process.env.SUPABASE_ANON_KEY": JSON.stringify(env.SUPABASE_ANON_KEY || ""),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY": JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ""),
    },
  };
});
