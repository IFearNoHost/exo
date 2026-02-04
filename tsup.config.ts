import { defineConfig } from "tsup";

/**
 * tsup Configuration for @fozooni/exo
 *
 * Builds both CommonJS and ESM formats with TypeScript declarations.
 * Optimized for library distribution with tree-shaking support.
 */
export default defineConfig({
  /**
   * Entry point for the library.
   */
  entry: ["src/index.ts"],

  /**
   * Output formats: CommonJS for Node.js require(), ESM for modern imports.
   */
  format: ["cjs", "esm"],

  /**
   * Generate TypeScript declaration files (.d.ts).
   */
  dts: true,

  /**
   * Generate source maps for debugging.
   */
  sourcemap: true,

  /**
   * Clean the output directory before each build.
   */
  clean: true,

  /**
   * Split code into separate chunks for better tree-shaking.
   */
  splitting: false,

  /**
   * Minimum Node.js version to target.
   */
  target: "node18",

  /**
   * External dependencies that should not be bundled.
   * zod and zod-to-json-schema are peer dependencies.
   */
  external: ["zod", "zod-to-json-schema"],

  /**
   * Output directory for compiled files.
   */
  outDir: "dist",

  /**
   * Enable tree-shaking for smaller bundle sizes.
   */
  treeshake: true,

  /**
   * Minify the output for production.
   */
  minify: false,
});
