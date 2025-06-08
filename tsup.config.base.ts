import { existsSync } from "fs";
import { cp } from "fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  bundle: true,
  onSuccess: async () => {
    const src = "src/prompts";
    const dest = "dist/prompts";
    if (existsSync(src)) await cp(src, dest, { recursive: true });
  }
});
