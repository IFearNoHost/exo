/**
 * @fozooni/exo - Safety Layer Tests
 *
 * Test suite for the Exoskeleton safety features:
 * - Risk management (RiskViolationError)
 * - Confirmation flow (ConfirmationRequiredError)
 * - Registry system (Exo class)
 */

import { z } from "zod";
import {
  createExoTool,
  Exo,
  RiskLevel,
  RiskViolationError,
  ConfirmationRequiredError,
} from "../src";
import type { ExoContext } from "../src";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * High-risk tool that simulates a dangerous database operation.
 * Requires admin privileges or sudo mode.
 */
const nukeDatabaseTool = createExoTool({
  name: "nuke_database",
  description: "Deletes all data from the database. EXTREMELY DANGEROUS.",
  schema: z.object({
    confirm: z.literal(true).describe("Must be true to confirm deletion"),
  }),
  executor: async () => {
    return { deleted: true, message: "All data has been deleted" };
  },
  config: {
    riskLevel: RiskLevel.HIGH,
  },
});

/**
 * Tool that requires explicit user confirmation before execution.
 */
const transferMoneyTool = createExoTool({
  name: "transfer_money",
  description: "Transfers money between accounts.",
  schema: z.object({
    amount: z.number().positive().describe("Amount to transfer"),
    toAccount: z.string().describe("Target account ID"),
  }),
  executor: async ({ amount, toAccount }) => {
    return { success: true, amount, toAccount, transactionId: "tx_123" };
  },
  config: {
    riskLevel: RiskLevel.MEDIUM,
    requiresConfirmation: true,
  },
});

/**
 * Low-risk tool for testing normal execution.
 */
const getBalanceTool = createExoTool({
  name: "get_balance",
  description: "Gets the current account balance.",
  schema: z.object({
    accountId: z.string().describe("Account ID"),
  }),
  executor: async ({ accountId }) => {
    return { accountId, balance: 1000.0, currency: "USD" };
  },
  config: {
    riskLevel: RiskLevel.LOW,
  },
});

// Context fixtures
const normalUserContext: ExoContext = {
  user: { id: "user_123", role: "user" },
  sessionId: "sess_abc",
};

const adminUserContext: ExoContext = {
  user: { id: "admin_001", role: "admin" },
  sessionId: "sess_xyz",
};

// ============================================================================
// Risk Management Tests
// ============================================================================

describe("Risk Management", () => {
  describe("HIGH Risk Tools", () => {
    it("should throw RiskViolationError for normal user", async () => {
      await expect(
        nukeDatabaseTool.execute({ confirm: true }, normalUserContext),
      ).rejects.toThrow(RiskViolationError);
    });

    it("should include tool name and role info in RiskViolationError", async () => {
      try {
        await nukeDatabaseTool.execute({ confirm: true }, normalUserContext);
        fail("Expected RiskViolationError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RiskViolationError);
        const riskError = error as RiskViolationError;
        expect(riskError.toolName).toBe("nuke_database");
        expect(riskError.requiredRole).toBe("admin");
        expect(riskError.actualRole).toBe("user");
        expect(riskError.code).toBe("RISK_VIOLATION");
      }
    });

    it("should succeed for admin user", async () => {
      const result = await nukeDatabaseTool.execute(
        { confirm: true },
        adminUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        deleted: true,
        message: "All data has been deleted",
      });
    });

    it("should succeed with sudo option for normal user", async () => {
      const result = await nukeDatabaseTool.execute(
        { confirm: true },
        normalUserContext,
        { sudo: true },
      );

      expect(result.success).toBe(true);
    });

    it("should succeed with legacy isAdmin context", async () => {
      const legacyAdminContext: ExoContext = {
        userId: "legacy_admin",
        isAdmin: true,
      };

      const result = await nukeDatabaseTool.execute(
        { confirm: true },
        legacyAdminContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("LOW Risk Tools", () => {
    it("should execute without admin privileges", async () => {
      const result = await getBalanceTool.execute(
        { accountId: "acc_123" },
        normalUserContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        accountId: "acc_123",
        balance: 1000.0,
        currency: "USD",
      });
    });

    it("should execute with empty context", async () => {
      const result = await getBalanceTool.execute({ accountId: "acc_456" });

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Confirmation Flow Tests
// ============================================================================

describe("Confirmation Flow", () => {
  describe("Tools Requiring Confirmation", () => {
    it("should throw ConfirmationRequiredError without confirmed option", async () => {
      await expect(
        transferMoneyTool.execute(
          { amount: 1000, toAccount: "acc_456" },
          normalUserContext,
        ),
      ).rejects.toThrow(ConfirmationRequiredError);
    });

    it("should include pending args in ConfirmationRequiredError", async () => {
      try {
        await transferMoneyTool.execute(
          { amount: 500, toAccount: "acc_789" },
          normalUserContext,
        );
        fail("Expected ConfirmationRequiredError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfirmationRequiredError);
        const confirmError = error as ConfirmationRequiredError;
        expect(confirmError.toolName).toBe("transfer_money");
        expect(confirmError.pendingArgs).toEqual({
          amount: 500,
          toAccount: "acc_789",
        });
        expect(confirmError.code).toBe("CONFIRMATION_REQUIRED");
      }
    });

    it("should succeed with confirmed: true option", async () => {
      const result = await transferMoneyTool.execute(
        { amount: 1000, toAccount: "acc_456" },
        normalUserContext,
        { confirmed: true },
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        amount: 1000,
        toAccount: "acc_456",
        transactionId: "tx_123",
      });
    });
  });

  describe("Tools Not Requiring Confirmation", () => {
    it("should execute without confirmed option", async () => {
      const result = await getBalanceTool.execute(
        { accountId: "acc_123" },
        normalUserContext,
      );

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Exo Registry Tests
// ============================================================================

describe("Exo Registry", () => {
  describe("Constructor", () => {
    it("should create registry with tools", () => {
      const exo = new Exo([
        nukeDatabaseTool,
        transferMoneyTool,
        getBalanceTool,
      ]);

      expect(exo.size).toBe(3);
      expect(exo.getToolNames()).toContain("nuke_database");
      expect(exo.getToolNames()).toContain("transfer_money");
      expect(exo.getToolNames()).toContain("get_balance");
    });

    it("should throw on duplicate tool names", () => {
      expect(() => {
        new Exo([getBalanceTool, getBalanceTool]);
      }).toThrow(/Duplicate tool name/);
    });

    it("should create empty registry", () => {
      const exo = new Exo();
      expect(exo.size).toBe(0);
    });
  });

  describe("register()", () => {
    it("should register new tools", () => {
      const exo = new Exo();
      exo.register(getBalanceTool);

      expect(exo.hasTool("get_balance")).toBe(true);
      expect(exo.size).toBe(1);
    });

    it("should throw on duplicate registration", () => {
      const exo = new Exo([getBalanceTool]);

      expect(() => {
        exo.register(getBalanceTool);
      }).toThrow(/already registered/);
    });
  });

  describe("getTool()", () => {
    it("should return tool by name", () => {
      const exo = new Exo([getBalanceTool]);
      const tool = exo.getTool("get_balance");

      expect(tool).toBeDefined();
      expect(tool?.name).toBe("get_balance");
    });

    it("should return undefined for unknown tool", () => {
      const exo = new Exo([getBalanceTool]);
      const tool = exo.getTool("unknown_tool");

      expect(tool).toBeUndefined();
    });
  });

  describe("process()", () => {
    it("should execute tool by name", async () => {
      const exo = new Exo([getBalanceTool]);
      const result = await exo.process(
        "get_balance",
        { accountId: "acc_123" },
        normalUserContext,
      );

      expect(result.success).toBe(true);
    });

    it("should throw for unknown tool", async () => {
      const exo = new Exo([getBalanceTool]);

      await expect(
        exo.process("unknown_tool", {}, normalUserContext),
      ).rejects.toThrow(/not found/);
    });

    it("should enforce risk checks through registry", async () => {
      const exo = new Exo([nukeDatabaseTool]);

      await expect(
        exo.process("nuke_database", { confirm: true }, normalUserContext),
      ).rejects.toThrow(RiskViolationError);
    });

    it("should enforce confirmation checks through registry", async () => {
      const exo = new Exo([transferMoneyTool]);

      await expect(
        exo.process(
          "transfer_money",
          { amount: 100, toAccount: "acc_456" },
          normalUserContext,
        ),
      ).rejects.toThrow(ConfirmationRequiredError);
    });

    it("should pass execution options through registry", async () => {
      const exo = new Exo([transferMoneyTool]);
      const result = await exo.process(
        "transfer_money",
        { amount: 100, toAccount: "acc_456" },
        normalUserContext,
        { confirmed: true },
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getOpenAIToolSet()", () => {
    it("should return OpenAI specs for all tools", () => {
      const exo = new Exo([nukeDatabaseTool, getBalanceTool]);
      const toolSet = exo.getOpenAIToolSet();

      expect(toolSet).toHaveLength(2);
      expect(toolSet[0]?.type).toBe("function");
      expect(toolSet[0]?.function.name).toBe("nuke_database");
      expect(toolSet[1]?.function.name).toBe("get_balance");
    });
  });

  describe("getAnthropicToolSet()", () => {
    it("should return Anthropic specs for all tools", () => {
      const exo = new Exo([nukeDatabaseTool, getBalanceTool]);
      const toolSet = exo.getAnthropicToolSet();

      expect(toolSet).toHaveLength(2);
      expect(toolSet[0]?.name).toBe("nuke_database");
      expect(toolSet[0]?.input_schema.type).toBe("object");
      expect(toolSet[1]?.name).toBe("get_balance");
    });
  });

  describe("Iteration", () => {
    it("should be iterable", () => {
      const exo = new Exo([nukeDatabaseTool, getBalanceTool]);
      const tools = [...exo];

      expect(tools).toHaveLength(2);
    });
  });

  describe("toJSON()", () => {
    it("should return serializable representation", () => {
      const exo = new Exo([getBalanceTool]);
      const json = exo.toJSON();

      expect(json.count).toBe(1);
      expect(Array.isArray(json.tools)).toBe(true);
    });
  });
});
