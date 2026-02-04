/**
 * @fozooni/exo - Observability Tests
 *
 * Test suite proving that lifecycle hooks fire universally:
 * - Direct execution via .execute()
 * - Through framework adapters (Vercel, LangChain)
 */

import { z } from "zod";
import {
  createExoTool,
  createConsoleLogger,
  toVercelTool,
  toLangChainTool,
} from "../src";
import type { ExoHooks } from "../src";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockHooks(): ExoHooks & {
  calls: { method: string; payload: unknown }[];
} {
  const calls: { method: string; payload: unknown }[] = [];

  return {
    calls,
    onStart: jest.fn((payload) => {
      calls.push({ method: "onStart", payload });
    }),
    onSuccess: jest.fn((payload) => {
      calls.push({ method: "onSuccess", payload });
    }),
    onError: jest.fn((payload) => {
      calls.push({ method: "onError", payload });
    }),
  };
}

// ============================================================================
// Direct Execution Tests
// ============================================================================

describe("Observability - Direct Execution", () => {
  it("should fire onStart and onSuccess hooks on successful execution", async () => {
    const hooks = createMockHooks();
    const tool = createExoTool({
      name: "test_tool",
      description: "A test tool",
      schema: z.object({ value: z.string() }),
      executor: async ({ value }) => ({ received: value }),
      config: { hooks },
    });

    const result = await tool.execute({ value: "hello" });

    expect(result.success).toBe(true);
    expect(hooks.onStart).toHaveBeenCalledTimes(1);
    expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
    expect(hooks.onError).not.toHaveBeenCalled();

    // Verify payload contents
    const startPayload = (hooks.onStart as jest.Mock).mock.calls[0][0];
    expect(startPayload.toolName).toBe("test_tool");
    expect(startPayload.args).toEqual({ value: "hello" });

    const successPayload = (hooks.onSuccess as jest.Mock).mock.calls[0][0];
    expect(successPayload.toolName).toBe("test_tool");
    expect(successPayload.result).toEqual({ received: "hello" });
    expect(successPayload.duration).toBeGreaterThan(0);
  });

  it("should fire onStart and onError hooks on failed execution", async () => {
    const hooks = createMockHooks();
    const tool = createExoTool({
      name: "failing_tool",
      description: "A tool that fails",
      schema: z.object({}),
      executor: async () => {
        throw new Error("Intentional failure");
      },
      config: { hooks },
    });

    await expect(tool.execute({})).rejects.toThrow("Intentional failure");

    expect(hooks.onStart).toHaveBeenCalledTimes(1);
    expect(hooks.onError).toHaveBeenCalledTimes(1);
    expect(hooks.onSuccess).not.toHaveBeenCalled();

    // Verify error payload
    const errorPayload = (hooks.onError as jest.Mock).mock.calls[0][0];
    expect(errorPayload.toolName).toBe("failing_tool");
    expect(errorPayload.error.message).toBe("Intentional failure");
    expect(errorPayload.duration).toBeGreaterThanOrEqual(0);
  });

  it("should not crash if hook throws an error", async () => {
    const brokenHooks: ExoHooks = {
      onStart: () => {
        throw new Error("Hook crashed!");
      },
      onSuccess: () => {
        throw new Error("Hook crashed!");
      },
    };

    const tool = createExoTool({
      name: "resilient_tool",
      description: "Should work despite broken hooks",
      schema: z.object({}),
      executor: async () => ({ ok: true }),
      config: { hooks: brokenHooks },
    });

    // Should not throw - hook errors are silently caught
    const result = await tool.execute({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
  });
});

// ============================================================================
// Adapter Universality Tests
// ============================================================================

describe("Observability - Universal (Adapters)", () => {
  it("should fire hooks when executed via Vercel adapter", async () => {
    const hooks = createMockHooks();
    const tool = createExoTool({
      name: "vercel_tool",
      description: "Tool for Vercel",
      schema: z.object({ input: z.string() }),
      executor: async ({ input }) => ({ output: input.toUpperCase() }),
      config: { hooks },
    });

    const vercelTool = toVercelTool(tool);
    const result = await vercelTool.execute({ input: "test" });

    expect(result).toEqual({ output: "TEST" });
    expect(hooks.onStart).toHaveBeenCalledTimes(1);
    expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
  });

  it("should fire hooks when executed via LangChain adapter", async () => {
    const hooks = createMockHooks();
    const tool = createExoTool({
      name: "langchain_tool",
      description: "Tool for LangChain",
      schema: z.object({ query: z.string() }),
      executor: async ({ query }) => ({ answer: `Response to: ${query}` }),
      config: { hooks },
    });

    const langchainTool = toLangChainTool(tool);
    const result = await langchainTool.func({ query: "hello" });

    expect(result).toEqual({ answer: "Response to: hello" });
    expect(hooks.onStart).toHaveBeenCalledTimes(1);
    expect(hooks.onSuccess).toHaveBeenCalledTimes(1);
  });

  it("should fire onError via adapter when execution fails", async () => {
    const hooks = createMockHooks();
    const tool = createExoTool({
      name: "failing_adapter_tool",
      description: "Fails via adapter",
      schema: z.object({}),
      executor: async () => {
        throw new Error("Adapter failure");
      },
      config: { hooks },
    });

    const vercelTool = toVercelTool(tool);

    await expect(vercelTool.execute({})).rejects.toThrow();
    expect(hooks.onError).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Console Logger Tests
// ============================================================================

describe("createConsoleLogger", () => {
  it("should create valid ExoHooks object", () => {
    const logger = createConsoleLogger();

    expect(typeof logger.onStart).toBe("function");
    expect(typeof logger.onSuccess).toBe("function");
    expect(typeof logger.onError).toBe("function");
  });

  it("should use custom prefix", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const logger = createConsoleLogger({ prefix: "[CUSTOM]" });

    logger.onStart!({ toolName: "test", args: {}, context: {} });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[CUSTOM]"),
      expect.anything(),
    );

    consoleSpy.mockRestore();
  });

  it("should log duration on success", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const logger = createConsoleLogger();

    logger.onSuccess!({
      toolName: "test",
      result: {},
      duration: 123.456,
      context: {},
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("123.46ms"),
    );

    consoleSpy.mockRestore();
  });
});
