/**
 * @fozooni/exo - Adapter Tests
 *
 * Test suite for provider adapters:
 * - OpenAI Strict Mode
 * - Vercel AI SDK adapter
 * - LangChain adapter
 */

import { z } from "zod";
import {
  createExoTool,
  Exo,
  RiskLevel,
  toVercelTool,
  toLangChainTool,
} from "../src";

// ============================================================================
// Test Fixtures
// ============================================================================

const weatherTool = createExoTool({
  name: "get_weather",
  description: "Gets the current weather for a city.",
  schema: z.object({
    city: z.string().describe("City name"),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  executor: async ({ city, units }) => {
    return { city, temperature: 22, units: units ?? "celsius" };
  },
  config: { riskLevel: RiskLevel.LOW },
});

const nestedTool = createExoTool({
  name: "create_user",
  description: "Creates a new user with address.",
  schema: z.object({
    name: z.string(),
    email: z.string().email(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zip: z.string(),
    }),
  }),
  executor: async (args) => ({ id: "user_123", ...args }),
});

// ============================================================================
// OpenAI Strict Mode Tests
// ============================================================================

describe("OpenAI Strict Mode", () => {
  describe("getOpenAISpec({ strict: true })", () => {
    it("should set additionalProperties: false on root object", () => {
      const spec = weatherTool.getOpenAISpec({ strict: true });

      expect(spec.function.strict).toBe(true);
      expect(spec.function.parameters.additionalProperties).toBe(false);
    });

    it("should mark all properties as required", () => {
      const spec = weatherTool.getOpenAISpec({ strict: true });
      const params = spec.function.parameters;

      expect(params.required).toContain("city");
      expect(params.required).toContain("units");
    });

    it("should set additionalProperties: false on nested objects", () => {
      const spec = nestedTool.getOpenAISpec({ strict: true });
      const params = spec.function.parameters as Record<string, unknown>;
      const properties = params.properties as Record<string, unknown>;
      const address = properties.address as Record<string, unknown>;

      expect(address.additionalProperties).toBe(false);
      expect(address.required).toContain("street");
      expect(address.required).toContain("city");
      expect(address.required).toContain("zip");
    });

    it("should not set strict flag when strict: false", () => {
      const spec = weatherTool.getOpenAISpec({ strict: false });

      expect(spec.function.strict).toBeUndefined();
      // additionalProperties is not modified in non-strict mode
    });

    it("should default to non-strict mode", () => {
      const spec = weatherTool.getOpenAISpec();

      expect(spec.function.strict).toBeUndefined();
    });
  });

  describe("Exo.getOpenAIToolSet({ strict: true })", () => {
    it("should pass strict flag to all tools", () => {
      const exo = new Exo([weatherTool, nestedTool]);
      const toolSet = exo.getOpenAIToolSet({ strict: true });

      expect(toolSet).toHaveLength(2);
      for (const tool of toolSet) {
        expect(tool.function.strict).toBe(true);
        expect(tool.function.parameters.additionalProperties).toBe(false);
      }
    });
  });
});

// ============================================================================
// Vercel AI SDK Adapter Tests
// ============================================================================

describe("Vercel AI SDK Adapter", () => {
  describe("toVercelTool()", () => {
    it("should return correct structure", () => {
      const vercelTool = toVercelTool(weatherTool);

      expect(vercelTool.description).toBe(weatherTool.description);
      expect(vercelTool.parameters).toBe(weatherTool.schema);
      expect(typeof vercelTool.execute).toBe("function");
    });

    it("should execute and return data on success", async () => {
      const vercelTool = toVercelTool(weatherTool);
      const result = await vercelTool.execute({ city: "Istanbul" });

      expect(result).toEqual({
        city: "Istanbul",
        temperature: 22,
        units: "celsius",
      });
    });

    it("should throw on validation error", async () => {
      const vercelTool = toVercelTool(weatherTool);

      await expect(vercelTool.execute({})).rejects.toThrow();
    });

    it("should pass context to executor", async () => {
      let capturedContext: unknown;
      const contextTool = createExoTool({
        name: "context_test",
        description: "Test context passing",
        schema: z.object({}),
        executor: async (_, ctx) => {
          capturedContext = ctx;
          return { ok: true };
        },
      });

      const vercelTool = toVercelTool(contextTool, {
        user: { id: "user_1", role: "admin" },
      });
      await vercelTool.execute({});

      expect(capturedContext).toEqual({
        user: { id: "user_1", role: "admin" },
      });
    });
  });

  describe("Exo.getVercelTools()", () => {
    it("should return object with tool names as keys", () => {
      const exo = new Exo([weatherTool]);
      const tools = exo.getVercelTools();

      expect(tools).toHaveProperty("get_weather");
      expect(typeof tools.get_weather?.execute).toBe("function");
    });

    it("should work with multiple tools", () => {
      const exo = new Exo([weatherTool, nestedTool]);
      const tools = exo.getVercelTools();

      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools).toHaveProperty("get_weather");
      expect(tools).toHaveProperty("create_user");
    });
  });
});

// ============================================================================
// LangChain Adapter Tests
// ============================================================================

describe("LangChain Adapter", () => {
  describe("toLangChainTool()", () => {
    it("should return correct structure", () => {
      const langchainTool = toLangChainTool(weatherTool);

      expect(langchainTool.name).toBe(weatherTool.name);
      expect(langchainTool.description).toBe(weatherTool.description);
      expect(langchainTool.schema).toBe(weatherTool.schema);
      expect(typeof langchainTool.func).toBe("function");
    });

    it("should execute and return data on success", async () => {
      const langchainTool = toLangChainTool(weatherTool);
      const result = await langchainTool.func({ city: "Tokyo" });

      expect(result).toEqual({
        city: "Tokyo",
        temperature: 22,
        units: "celsius",
      });
    });

    it("should throw on validation error", async () => {
      const langchainTool = toLangChainTool(weatherTool);

      await expect(langchainTool.func({ city: 123 })).rejects.toThrow();
    });
  });
});
