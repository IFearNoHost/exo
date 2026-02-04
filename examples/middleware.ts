/**
 * @fozooni/exo - Middleware Example
 *
 * Demonstrates how to use middleware for:
 * 1. Rate Limiting (built-in)
 * 2. Logging / Analytics (custom)
 * 3. Argument Modification (custom)
 *
 * Run: npx ts-node examples/middleware.ts
 */

import { z } from "zod";
import {
  createExoTool,
  createRateLimiter,
  ExoMiddleware,
  createConsoleLogger,
} from "../src";

// ============================================================================
// 1. Custom Logging Middleware
// ============================================================================

const loggingMiddleware: ExoMiddleware = async ({ toolName, args, next }) => {
  console.log(`[Middleware] -> Intercepted ${toolName} with args:`, args);

  const startTime = Date.now();
  const result = await next();
  const duration = Date.now() - startTime;

  console.log(
    `[Middleware] <- Finished ${toolName} in ${duration}ms. Success: ${result.success}`,
  );

  return result;
};

// ============================================================================
// 2. Argument Modifier Middleware
// ============================================================================

// This middleware automatically uppercases the 'query' argument
const uppercaseMiddleware: ExoMiddleware = async ({ args, next }) => {
  // Safe casting because we know this middleware is only used for tools with 'query'
  const typedArgs = args as { query?: string };

  if (typedArgs.query) {
    const original = typedArgs.query;
    typedArgs.query = original.toUpperCase();
    console.log(
      `[Middleware] Transforming query: "${original}" -> "${typedArgs.query}"`,
    );
  }

  return next();
};

// ============================================================================
// 3. Setup Tools
// ============================================================================

// Rate limiter: 2 requests per 5 seconds
const limiter = createRateLimiter({
  windowMs: 5000,
  limit: 2,
  keyGenerator: () => "global_key", // Simple global limit for demo
});

const searchTool = createExoTool({
  name: "search",
  description: "A secure search tool.",
  schema: z.object({ query: z.string() }),
  executor: async ({ query }) => {
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { results: [`Result for ${query}`], count: 1 };
  },
  config: {
    // Order matters: RateLimit -> Log -> Modify -> Execute
    middleware: [limiter, loggingMiddleware, uppercaseMiddleware],
    hooks: createConsoleLogger(), // Combine with Hooks!
  },
});

// ============================================================================
// 4. Run Demo
// ============================================================================

async function main() {
  console.log("--- Request 1 (Allowed) ---");
  await searchTool.execute({ query: "hello world" });
  console.log();

  console.log("--- Request 2 (Allowed) ---");
  await searchTool.execute({ query: "second request" });
  console.log();

  console.log("--- Request 3 (BLOCKED by Rate Limit) ---");
  // This should fail because limit is 2
  const result = await searchTool.execute({ query: "spam request" });

  if (!result.success) {
    console.log("❌ Blocked:", result.error);
  }
}

main().catch(console.error);
