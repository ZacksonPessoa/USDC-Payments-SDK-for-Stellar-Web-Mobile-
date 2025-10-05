import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],       // ponto de entrada único
  format: ["esm", "cjs"],        // gera ESM + CJS
  dts: true,                     // gera declarações .d.ts
  sourcemap: true,               // gera mapa de origem (útil p/ debug)
  clean: true,                   // limpa dist antes do build
  minify: false,                 // não minifica (melhor p/ dev)
  target: "es2020",              // compatível com nosso tsconfig
  skipNodeModulesBundle: true,   // não embute dependências externas
  splitting: false,              // bundle único
  external: ["react", "react-dom"], // React deve ser externo
});
