import { readFileSync, writeFileSync } from "fs";
import { chmod, cp } from "fs/promises";
import { resolve } from "path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  bundle: true,
  onSuccess: async () => {
    const src = resolve(__dirname, "src/templates");
    const dest = resolve(__dirname, "dist/templates");
    await cp(src, dest, { recursive: true });
    await chmod("dist/index.js", "755");

    const corePackageJson = readFileSync(
      resolve(__dirname, "../core/package.json")
    );
    const version = JSON.parse(corePackageJson.toString()).version;

    const packageJson = readFileSync(
      resolve(__dirname, "dist/templates/package.json.liquid")
    );
    const updatedPackageJson = packageJson
      .toString()
      .replace(/__VERSION__/g, version);

    writeFileSync(
      resolve(__dirname, "dist/templates/package.json.liquid"),
      updatedPackageJson
    );
  }
});
