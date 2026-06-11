import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  minify: false,
  external: ["sharp"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
