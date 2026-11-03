import { defineConfig, mergeConfig } from "vite";
import { fileURLToPath } from "node:url";
import appConfig from "../../vite.config";
export default mergeConfig(
  appConfig,
  defineConfig({
    optimizeDeps: { noDiscovery: true, entries: [] },
    resolve: {
      alias: [
        {
          find: "@/lib/supabase",
          replacement: fileURLToPath(new URL("./fixture.ts", import.meta.url)),
        },
        {
          find: "@/app/auth/AuthProvider",
          replacement: fileURLToPath(new URL("./auth.ts", import.meta.url)),
        },
      ],
    },
  }),
);
