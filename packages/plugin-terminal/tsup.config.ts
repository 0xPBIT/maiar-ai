import { chmod, cp } from "fs/promises";
import { resolve } from "path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "scripts/chat": "src/scripts/chat.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  bundle: true,
  onSuccess: async () => {
    const src = resolve(__dirname, "src/prompts");
    const dest = resolve(__dirname, "dist/prompts");
    await cp(src, dest, { recursive: true });
    await chmod("dist/scripts/chat.js", "755");
  }
});
