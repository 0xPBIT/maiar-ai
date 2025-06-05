import fs from "fs/promises";
import path from "path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    logger: "src/lib/logger/index.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  onSuccess: async () => {
    const src = path.resolve(__dirname, "prompts");
    const dest = path.resolve(__dirname, "dist/prompts");
    await fs.cp(src, dest, { recursive: true });
  }
});
