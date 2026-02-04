/**
 * @fozooni/exo - Core Tests
 *
 * Test suite for the ExoTool class, validating:
 * - OpenAI specification generation
 * - Anthropic specification generation
 * - Successful execution with valid arguments
 * - Validation errors with invalid arguments
 */

import { z } from "zod";
import { createExoTool, ExoTool, RiskLevel, ValidationError } from "../src";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Weather tool schema for testing.
 */
const weatherSchema = z.object({
  city: z.string().min(1).describe("The city to get weather for"),
});

/**
 * Weather data type returned by the executor.
 */
interface WeatherData {
  temperature: number;
  conditions: string;
  city: string;
}

/**
 * Create a weather tool for testing.
 */
function createWeatherTool() {
  return createExoTool({
    name: "get_weather",
    description: "Retrieves the current weather for a specified city.",
    schema: weatherSchema,
    executor: async ({ city }): Promise<WeatherData> => {
      return {
        temperature: 22,
        conditions: "sunny",
        city,
      };
    },
    config: {
      riskLevel: RiskLevel.LOW,
    },
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe("ExoTool", () => {
  describe("Constructor", () => {
    it("should create an instance with valid options", () => {
      const tool = createWeatherTool();

      expect(tool).toBeInstanceOf(ExoTool);
      expect(tool.name).toBe("get_weather");
      expect(tool.description).toBe(
        "Retrieves the current weather for a specified city.",
      );
    });

    it("should throw error for empty name", () => {
      expect(() => {
        createExoTool({
          name: "",
          description: "Test description",
          schema: z.object({}),
          executor: async () => ({}),
        });
      }).toThrow("Tool name is required and cannot be empty");
    });

    it("should throw error for empty description", () => {
      expect(() => {
        createExoTool({
          name: "test_tool",
          description: "",
          schema: z.object({}),
          executor: async () => ({}),
        });
      }).toThrow("Tool description is required and cannot be empty");
    });

    it("should apply default configuration values", () => {
      const tool = createWeatherTool();

      expect(tool.config.riskLevel).toBe(RiskLevel.LOW);
      expect(tool.config.requiresConfirmation).toBe(false);
      expect(tool.config.retryable).toBe(true);
      expect(tool.config.maxRetries).toBe(3);
    });
  });

  describe("validate()", () => {
    it("should return success for valid arguments", () => {
      const tool = createWeatherTool();
      const result = tool.validate({ city: "Istanbul" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ city: "Istanbul" });
      expect(result.errors).toBeUndefined();
    });

    it("should return errors for invalid arguments", () => {
      const tool = createWeatherTool();
      const result = tool.validate({ city: 123 });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should return errors for missing required fields", () => {
      const tool = createWeatherTool();
      const result = tool.validate({});

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe("getOpenAISpec()", () => {
    it("should return valid OpenAI tool specification", () => {
      const tool = createWeatherTool();
      const spec = tool.getOpenAISpec();

      expect(spec.type).toBe("function");
      expect(spec.function.name).toBe("get_weather");
      expect(spec.function.description).toBe(
        "Retrieves the current weather for a specified city.",
      );
      expect(spec.function.parameters).toBeDefined();
      // strict is undefined by default (non-strict mode)
      expect(spec.function.strict).toBeUndefined();
    });

    it("should include properties in parameters", () => {
      const tool = createWeatherTool();
      const spec = tool.getOpenAISpec();

      const params = spec.function.parameters as Record<string, unknown>;
      expect(params.type).toBe("object");
      expect(params.properties).toBeDefined();

      const properties = params.properties as Record<string, unknown>;
      expect(properties.city).toBeDefined();
    });

    it("should include required fields", () => {
      const tool = createWeatherTool();
      const spec = tool.getOpenAISpec();

      const params = spec.function.parameters as Record<string, unknown>;
      expect(params.required).toContain("city");
    });
  });

  describe("getAnthropicSpec()", () => {
    it("should return valid Anthropic tool specification", () => {
      const tool = createWeatherTool();
      const spec = tool.getAnthropicSpec();

      expect(spec.name).toBe("get_weather");
      expect(spec.description).toBe(
        "Retrieves the current weather for a specified city.",
      );
      expect(spec.input_schema).toBeDefined();
      expect(spec.input_schema.type).toBe("object");
    });

    it("should include properties in input_schema", () => {
      const tool = createWeatherTool();
      const spec = tool.getAnthropicSpec();

      expect(spec.input_schema.properties).toBeDefined();
      expect(spec.input_schema.properties.city).toBeDefined();
    });

    it("should include required fields", () => {
      const tool = createWeatherTool();
      const spec = tool.getAnthropicSpec();

      expect(spec.input_schema.required).toContain("city");
    });
  });

  describe("execute()", () => {
    it("should return success for valid arguments", async () => {
      const tool = createWeatherTool();
      const result = await tool.execute({ city: "Istanbul" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.city).toBe("Istanbul");
      expect(result.data!.temperature).toBe(22);
      expect(result.data!.conditions).toBe("sunny");
    });

    it("should include metadata in successful result", async () => {
      const tool = createWeatherTool();
      const result = await tool.execute({ city: "Istanbul" });

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.toolName).toBe("get_weather");
      expect(result.metadata!.riskLevel).toBe(RiskLevel.LOW);
      expect(typeof result.metadata!.executionTime).toBe("number");
    });

    it("should throw ValidationError for invalid arguments", async () => {
      const tool = createWeatherTool();

      await expect(tool.execute({ city: 123 })).rejects.toThrow(
        ValidationError,
      );
    });

    it("should include field errors in ValidationError", async () => {
      const tool = createWeatherTool();

      try {
        await tool.execute({ city: 123 });
        fail("Expected ValidationError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.fieldErrors).toBeDefined();
        expect(validationError.fieldErrors.length).toBeGreaterThan(0);
      }
    });

    it("should pass context to executor", async () => {
      let receivedContext: unknown;

      const tool = createExoTool({
        name: "context_test",
        description: "Test context passing",
        schema: z.object({}),
        executor: async (_args, context) => {
          receivedContext = context;
          return {};
        },
      });

      const context = { userId: "user_123", isAdmin: true };
      await tool.execute({}, context);

      expect(receivedContext).toEqual(context);
    });
  });

  describe("Complex Schema", () => {
    it("should handle optional fields with defaults", async () => {
      const schema = z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
      });

      const tool = createExoTool({
        name: "search",
        description: "Search with pagination",
        schema,
        executor: async (args) => args,
      });

      const result = await tool.execute({ query: "test" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        query: "test",
        limit: 10,
        offset: 0,
      });
    });

    it("should handle enum fields", async () => {
      const schema = z.object({
        units: z.enum(["celsius", "fahrenheit"]),
      });

      const tool = createExoTool({
        name: "temperature",
        description: "Temperature conversion",
        schema,
        executor: async (args) => args,
      });

      const result = await tool.execute({ units: "celsius" });
      expect(result.success).toBe(true);

      await expect(tool.execute({ units: "kelvin" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("Utility Methods", () => {
    it("should return string representation", () => {
      const tool = createWeatherTool();
      expect(tool.toString()).toBe("ExoTool(get_weather)");
    });

    it("should return JSON representation", () => {
      const tool = createWeatherTool();
      const json = tool.toJSON();

      expect(json.name).toBe("get_weather");
      expect(json.description).toBe(
        "Retrieves the current weather for a specified city.",
      );
      expect(json.config).toBeDefined();
    });
  });
});
