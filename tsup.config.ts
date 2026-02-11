import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    target: "es2020",
    platform: "browser",
    outDir: "dist",
    skipNodeModulesBundle: true,
    external: ["react", "react-dom", "stellar-sdk"],
  },
  {
    entry: { index: "src/server/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false, // Do not clean dist folder
    minify: false,
    target: "node18",
    platform: "node",
    outDir: "dist/server",
    skipNodeModulesBundle: true,
    external: ["sqlite3", "stellar-sdk"],
  },
]);
