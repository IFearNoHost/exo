/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  /**
   * Use ts-jest ESM preset for ESM + TypeScript support.
   */
  preset: "ts-jest/presets/default-esm",

  /**
   * Test environment: Node.js runtime.
   */
  testEnvironment: "node",

  /**
   * Root directory for tests and source files.
   */
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  /**
   * Test file patterns to match.
   */
  testMatch: ["**/*.test.ts", "**/*.spec.ts"],

  /**
   * Module file extensions.
   */
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  /**
   * Module name mapping to handle .js extensions in TypeScript imports.
   * This is required for NodeNext module resolution compatibility.
   */
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  /**
   * Globals configuration for ts-jest.
   */
  extensionsToTreatAsEsm: [".ts"],

  /**
   * Transform configuration for ts-jest ESM support.
   */
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          // Override for tests to work with Jest
          module: "ESNext",
          moduleResolution: "Bundler",
          verbatimModuleSyntax: false,
        },
      },
    ],
  },

  /**
   * Coverage collection configuration.
   */
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],

  /**
   * Coverage thresholds (adjust as needed).
   */
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  /**
   * Clear mocks between tests for isolation.
   */
  clearMocks: true,

  /**
   * Verbose output for better debugging.
   */
  verbose: true,
};

module.exports = config;
