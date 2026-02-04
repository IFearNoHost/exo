/**
 * @fozooni/exo - Framework Adapters
 *
 * Adapters for integrating ExoTools with popular AI frameworks
 * like Vercel AI SDK and LangChain.
 *
 * @packageDocumentation
 */

import type { ZodTypeAny } from "zod";
import type { ExoContext } from "../types/index.js";
import { ExoTool } from "../core/ExoTool.js";

// ============================================================================
// Vercel AI SDK Adapter
// ============================================================================

/**
 * Vercel AI SDK tool format.
 *
 * Compatible with the `tool()` function from `ai` package.
 */
export interface VercelToolSpec {
  description: string;
  parameters: ZodTypeAny;
  execute: (
    args: unknown,
    options?: { abortSignal?: AbortSignal },
  ) => Promise<unknown>;
}

/**
 * Converts an ExoTool to a Vercel AI SDK compatible tool.
 *
 * The returned object can be used directly with Vercel's AI SDK functions
 * like `streamText`, `generateText`, or `useChat`.
 *
 * @param exoTool - The ExoTool to convert.
 * @param context - Optional default context for executions.
 * @returns A Vercel AI SDK compatible tool specification.
 *
 * @example
 * ```typescript
 * import { streamText } from 'ai';
 * import { toVercelTool } from '@fozooni/exo/adapters';
 *
 * const weatherTool = createExoTool({ ... });
 * const tools = { get_weather: toVercelTool(weatherTool) };
 *
 * const result = await streamText({
 *   model: openai('gpt-4'),
 *   tools,
 *   messages,
 * });
 * ```
 */
export function toVercelTool<TSchema extends ZodTypeAny, TOutput>(
  exoTool: ExoTool<TSchema, TOutput>,
  context: ExoContext = {},
): VercelToolSpec {
  return {
    description: exoTool.description,
    parameters: exoTool.schema,
    execute: async (args: unknown): Promise<TOutput> => {
      const result = await exoTool.execute(args, context);
      if (result.success && result.data !== undefined) {
        return result.data;
      }
      throw new Error(result.error ?? "Execution failed");
    },
  };
}

// ============================================================================
// LangChain Adapter
// ============================================================================

/**
 * LangChain DynamicStructuredTool compatible format.
 */
export interface LangChainToolSpec {
  name: string;
  description: string;
  schema: ZodTypeAny;
  func: (args: unknown) => Promise<unknown>;
}

/**
 * Converts an ExoTool to a LangChain compatible tool.
 *
 * The returned object can be used with LangChain's `DynamicStructuredTool`
 * or directly as a tool in LangChain agents.
 *
 * @param exoTool - The ExoTool to convert.
 * @param context - Optional default context for executions.
 * @returns A LangChain compatible tool specification.
 *
 * @example
 * ```typescript
 * import { DynamicStructuredTool } from 'langchain/tools';
 * import { toLangChainTool } from '@fozooni/exo/adapters';
 *
 * const weatherTool = createExoTool({ ... });
 * const langchainTool = new DynamicStructuredTool(toLangChainTool(weatherTool));
 * ```
 */
export function toLangChainTool<TSchema extends ZodTypeAny, TOutput>(
  exoTool: ExoTool<TSchema, TOutput>,
  context: ExoContext = {},
): LangChainToolSpec {
  return {
    name: exoTool.name,
    description: exoTool.description,
    schema: exoTool.schema,
    func: async (args: unknown): Promise<TOutput> => {
      const result = await exoTool.execute(args, context);
      if (result.success && result.data !== undefined) {
        return result.data;
      }
      throw new Error(result.error ?? "Execution failed");
    },
  };
}

// ============================================================================
// Batch Conversion Helpers
// ============================================================================

/**
 * Converts multiple ExoTools to a Vercel AI SDK tools object.
 *
 * @param tools - Array of ExoTools to convert.
 * @param context - Optional default context for all executions.
 * @returns An object with tool names as keys and Vercel tools as values.
 *
 * @example
 * ```typescript
 * const tools = toVercelTools([weatherTool, searchTool]);
 * // { get_weather: {...}, search_web: {...} }
 * ```
 */
export function toVercelTools(
  tools: ExoTool<ZodTypeAny, unknown>[],
  context: ExoContext = {},
): Record<string, VercelToolSpec> {
  const result: Record<string, VercelToolSpec> = {};
  for (const tool of tools) {
    result[tool.name] = toVercelTool(tool, context);
  }
  return result;
}

/**
 * Converts multiple ExoTools to LangChain tool specifications.
 *
 * @param tools - Array of ExoTools to convert.
 * @param context - Optional default context for all executions.
 * @returns An array of LangChain tool specifications.
 */
export function toLangChainTools(
  tools: ExoTool<ZodTypeAny, unknown>[],
  context: ExoContext = {},
): LangChainToolSpec[] {
  return tools.map((tool) => toLangChainTool(tool, context));
}
