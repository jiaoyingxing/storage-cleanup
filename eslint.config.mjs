import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

// 官方商店扫描同款规则集；本地 0 error 是发布前的最低证据。
export default defineConfig([
  {
    ignores: [
      "main.js",
      "dist/**",
      "node_modules/**",
      "scripts/**",
      "test/**",
      "docs/**",
      ".tmp/**",
      "esbuild.config.mjs",
      "eslint.config.mjs"
    ]
  },
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"]
        }
      }
    }
  }
]);
