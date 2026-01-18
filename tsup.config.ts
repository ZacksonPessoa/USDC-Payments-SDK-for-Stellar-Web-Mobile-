import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server/index.ts"
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "node18", // Changed to node18 for better server support, though client might need lower.
                    // Actually, tsup can target neutral.
                    // But since we are splitting, we might want different targets?
                    // For now, keep it simple. es2020 is fine for both usually.
  platform: "neutral", // Allow node and browser
  skipNodeModulesBundle: true,
  splitting: false,
  external: ["react", "react-dom"],
});
