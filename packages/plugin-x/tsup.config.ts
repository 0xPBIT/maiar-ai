import { defineConfig } from "tsup";
import { chmod } from "fs/promises";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "scripts/auth-flow": "src/scripts/auth-flow.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  async onSuccess() {
    await chmod("dist/scripts/auth-flow.js", "755");
  }
});
