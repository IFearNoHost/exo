/**
 * @fozooni/exo - Showcase Example
 *
 * This example demonstrates the full power of the Exo library:
 * - Type-safe tool creation with Zod schemas
 * - Risk-based access control (HIGH risk requires admin)
 * - Universal hooks for observability
 *
 * Run: npx ts-node examples/showcase.ts
 */

import { z } from "zod";
import {
  createExoTool,
  Exo,
  RiskLevel,
  createConsoleLogger,
  RiskViolationError,
} from "../src";

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * LOW RISK: A simple read-only operation.
 * Anyone can execute this tool.
 */
const getUserTool = createExoTool({
  name: "get_user",
  description: "Retrieves a user by their ID.",
  schema: z.object({
    userId: z.string().describe("The user ID to look up"),
  }),
  executor: async ({ userId }) => {
    // Simulate database lookup
    return {
      id: userId,
      name: "Ahmad Fozooni",
      email: "ahmad@fozooni.com",
    };
  },
  config: {
    riskLevel: RiskLevel.LOW,
    hooks: createConsoleLogger(), // Attach observability
  },
});

/**
 * HIGH RISK: A dangerous destructive operation.
 * Only admins can execute this tool.
 */
const deleteDatabaseTool = createExoTool({
  name: "delete_database",
  description: "Permanently deletes the entire database. IRREVERSIBLE.",
  schema: z.object({
    confirm: z.literal(true).describe("Must be true to confirm deletion"),
    databaseName: z.string().describe("Name of the database to delete"),
  }),
  executor: async ({ databaseName }) => {
    // Simulate dangerous operation
    return {
      deleted: true,
      database: databaseName,
      timestamp: new Date().toISOString(),
    };
  },
  config: {
    riskLevel: RiskLevel.HIGH, // Requires admin role!
    hooks: createConsoleLogger(),
  },
});

// ============================================================================
// Demo Flow
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("@fozooni/exo - Showcase Demo");
  console.log("=".repeat(60));
  console.log();

  // Create the Exo registry with both tools
  const exo = new Exo([getUserTool, deleteDatabaseTool]);

  console.log(`Registered ${exo.size} tools: ${exo.getToolNames().join(", ")}`);
  console.log();

  // -------------------------------------------------------------------------
  // Scenario 1: Guest user reads data (should succeed)
  // -------------------------------------------------------------------------
  console.log("--- Scenario 1: Guest reads user data ---");
  const guestContext = { user: { id: "guest_123", role: "guest" } };

  const userResult = await exo.process(
    "get_user",
    { userId: "user_456" },
    guestContext,
  );

  console.log("Result:", userResult.data);
  console.log();

  // -------------------------------------------------------------------------
  // Scenario 2: Guest tries to delete database (should FAIL)
  // -------------------------------------------------------------------------
  console.log("--- Scenario 2: Guest tries to delete database ---");

  try {
    await exo.process(
      "delete_database",
      { confirm: true, databaseName: "production" },
      guestContext, // Guest context - NOT allowed!
    );
  } catch (error) {
    if (error instanceof RiskViolationError) {
      console.log("❌ BLOCKED:", error.message);
      console.log("   Required role:", error.requiredRole);
      console.log("   Actual role:", error.actualRole);
    }
  }
  console.log();

  // -------------------------------------------------------------------------
  // Scenario 3: Admin deletes database (should succeed)
  // -------------------------------------------------------------------------
  console.log("--- Scenario 3: Admin deletes database ---");
  const adminContext = { user: { id: "admin_001", role: "admin" } };

  const deleteResult = await exo.process(
    "delete_database",
    { confirm: true, databaseName: "staging" },
    adminContext, // Admin context - ALLOWED!
  );

  console.log("✅ Result:", deleteResult.data);
  console.log();

  // -------------------------------------------------------------------------
  // Bonus: Generate OpenAI Specs
  // -------------------------------------------------------------------------
  console.log("--- Bonus: OpenAI Tool Specs (Strict Mode) ---");
  const specs = exo.getOpenAIToolSet({ strict: true });

  for (const spec of specs) {
    console.log(`- ${spec.function.name}: ${spec.function.description}`);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Demo complete!");
  console.log("=".repeat(60));
}

main().catch(console.error);
