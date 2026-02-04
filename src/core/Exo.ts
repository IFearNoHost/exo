/**
 * @fozooni/exo - Exo Registry Class
 *
 * The main container for managing and orchestrating multiple ExoTools.
 * Provides centralized tool registration, lookup, and execution.
 *
 * @packageDocumentation
 */

import type {
  ExoContext,
  OpenAIToolSpec,
  AnthropicToolSpec,
  ExoExecutionResult,
  ExecutionOptions,
} from "../types/index.js";
import { ExoTool } from "./ExoTool.js";
import { toVercelTool, type VercelToolSpec } from "../adapters/index.js";

/**
 * The main registry for managing ExoTools.
 *
 * Exo acts as a container that holds multiple tools and provides
 * methods for retrieving tools, executing them safely, and generating
 * specifications for AI providers.
 *
 * @example
 * ```typescript
 * import { Exo, createExoTool, RiskLevel } from '@fozooni/exo';
 * import { z } from 'zod';
 *
 * const weatherTool = createExoTool({
 *   name: 'get_weather',
 *   description: 'Get weather for a city',
 *   schema: z.object({ city: z.string() }),
 *   executor: async ({ city }) => ({ temperature: 22 }),
 * });
 *
 * const searchTool = createExoTool({
 *   name: 'search_web',
 *   description: 'Search the web',
 *   schema: z.object({ query: z.string() }),
 *   executor: async ({ query }) => ({ results: [] }),
 * });
 *
 * const exo = new Exo([weatherTool, searchTool]);
 *
 * // Get OpenAI-compatible tool specs
 * const toolSet = exo.getOpenAIToolSet();
 *
 * // Execute a tool by name
 * const result = await exo.process('get_weather', { city: 'Istanbul' }, context);
 * ```
 */
/**
 * Base type for any ExoTool that can be stored in the registry.
 * Uses `any` for the schema and output types to allow storing mixed tool types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExoTool = ExoTool<any, any>;

export class Exo {
  /**
   * Internal map of registered tools by name.
   */
  private readonly tools: Map<string, AnyExoTool>;

  /**
   * Creates a new Exo registry instance.
   *
   * @param tools - Array of ExoTool instances to register.
   * @throws {Error} If duplicate tool names are detected.
   */
  constructor(tools: readonly AnyExoTool[] = []) {
    this.tools = new Map();

    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        throw new Error(
          `Duplicate tool name: "${tool.name}". Each tool must have a unique name.`,
        );
      }
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Registers a new tool with the registry.
   *
   * @param tool - The ExoTool instance to register.
   * @throws {Error} If a tool with the same name already exists.
   */
  register(tool: AnyExoTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool "${tool.name}" is already registered. Use a unique name.`,
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieves a tool by its name.
   *
   * @param name - The name of the tool to retrieve.
   * @returns The tool instance, or undefined if not found.
   */
  getTool(name: string): AnyExoTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool with the given name is registered.
   *
   * @param name - The name of the tool to check.
   * @returns True if the tool exists, false otherwise.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Returns an array of all registered tool names.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Returns the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Executes a registered tool by name with safety checks.
   *
   * This is the primary method for executing tools through the registry.
   * It handles:
   * - Tool lookup
   * - Argument validation
   * - Permission checks
   * - Confirmation requirements
   * - Execution and error handling
   *
   * @param toolName - The name of the tool to execute.
   * @param args - The arguments to pass to the tool.
   * @param context - The execution context (user info, session, etc.).
   * @param options - Optional execution options (sudo, confirmed).
   * @returns A promise resolving to the execution result.
   *
   * @throws {Error} If the tool is not found.
   * @throws {ValidationError} If arguments fail validation.
   * @throws {RiskViolationError} If permission checks fail.
   * @throws {ConfirmationRequiredError} If confirmation is needed.
   *
   * @example
   * ```typescript
   * const result = await exo.process(
   *   'get_weather',
   *   { city: 'Istanbul' },
   *   { user: { id: '1', role: 'user' } }
   * );
   * ```
   */
  async process(
    toolName: string,
    args: unknown,
    context: ExoContext = {},
    options: ExecutionOptions = {},
  ): Promise<ExoExecutionResult<unknown>> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(
        `Tool "${toolName}" not found. Available tools: ${this.getToolNames().join(", ")}`,
      );
    }

    return tool.execute(args, context, options);
  }

  /**
   * Returns OpenAI-compatible tool specifications for all registered tools.
   *
   * The returned array can be directly used with OpenAI's chat completion API.
   *
   * @returns Array of OpenAI tool specifications.
   *
   * @example
   * ```typescript
   * const toolSet = exo.getOpenAIToolSet();
   * const response = await openai.chat.completions.create({
   *   model: 'gpt-4',
   *   messages: [...],
   *   tools: toolSet,
   * });
   *
   * // With strict mode for Structured Outputs
   * const strictTools = exo.getOpenAIToolSet({ strict: true });
   * ```
   */
  getOpenAIToolSet(options: { strict?: boolean } = {}): OpenAIToolSpec[] {
    return Array.from(this.tools.values()).map((tool) =>
      tool.getOpenAISpec(options),
    );
  }

  /**
   * Returns Vercel AI SDK compatible tools for all registered tools.
   *
   * The returned object can be spread directly into Vercel AI SDK functions
   * like `streamText`, `generateText`, or the `useChat` hook.
   *
   * @param context - Optional default context for all executions.
   * @returns An object with tool names as keys and Vercel tools as values.
   *
   * @example
   * ```typescript
   * const tools = exo.getVercelTools();
   * const result = await streamText({
   *   model: openai('gpt-4'),
   *   tools,
   *   messages,
   * });
   * ```
   */
  getVercelTools(context: ExoContext = {}): Record<string, VercelToolSpec> {
    const result: Record<string, VercelToolSpec> = {};
    for (const tool of this.tools.values()) {
      result[tool.name] = toVercelTool(tool, context);
    }
    return result;
  }

  /**
   * Returns Anthropic-compatible tool specifications for all registered tools.
   *
   * The returned array can be directly used with Anthropic's message API.
   *
   * @returns Array of Anthropic tool specifications.
   *
   * @example
   * ```typescript
   * const toolSet = exo.getAnthropicToolSet();
   * const response = await anthropic.messages.create({
   *   model: 'claude-3-opus-20240229',
   *   messages: [...],
   *   tools: toolSet,
   * });
   * ```
   */
  getAnthropicToolSet(): AnthropicToolSpec[] {
    return Array.from(this.tools.values()).map((tool) =>
      tool.getAnthropicSpec(),
    );
  }

  /**
   * Returns an iterator over all registered tools.
   */
  *[Symbol.iterator](): Iterator<AnyExoTool> {
    yield* this.tools.values();
  }

  /**
   * Returns a JSON-serializable representation of the registry.
   */
  toJSON(): Record<string, unknown> {
    return {
      tools: Array.from(this.tools.values()).map((tool) => tool.toJSON()),
      count: this.tools.size,
    };
  }
}
