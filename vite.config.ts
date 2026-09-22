import { defineConfig, configDefaults } from "vitest/config";
import { searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

import {
  handleAntigravityStatus,
  handleAntigravityGenerate,
  handleAntigravityTranslate,
  handleAntigravityGenerateCode,
} from "./src/server/antigravityMiddleware";

function antigravityPlugin() {
  return {
    name: "antigravity-bridge-plugin",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/antigravity/status") {
          handleAntigravityStatus(req, res);
          return;
        }
        if (url === "/api/antigravity/generate") {
          handleAntigravityGenerate(req, res).catch((err) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          });
          return;
        }
        if (url === "/api/antigravity/translate") {
          handleAntigravityTranslate(req, res).catch((err) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          });
          return;
        }
        if (url === "/api/antigravity/generate-code") {
          handleAntigravityGenerateCode(req, res).catch((err) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), antigravityPlugin()],
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        "../../node_modules",
      ],
    },
    proxy: {
      "/api/nvidia": {
        target: "https://integrate.api.nvidia.com/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, ""),
      },
    },
  },

  define: {
    "process.env.IS_PREACT": JSON.stringify("true"),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, ".worktrees/**"],
  },
});

