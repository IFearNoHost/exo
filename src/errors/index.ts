/**
 * @fozooni/exo - Custom Error Classes
 *
 * Error classes for handling validation and execution failures
 * with rich context and structured error information.
 *
 * @packageDocumentation
 */

/**
 * Base error class for all Exo-related errors.
 *
 * Provides a consistent error structure with additional context
 * for debugging and error handling.
 */
export class ExoError extends Error {
  /**
   * Unique error code for programmatic error handling.
   */
  public readonly code: string;

  /**
   * Additional context about the error.
   */
  public readonly context: Record<string, unknown> | undefined;

  /**
   * Creates a new ExoError instance.
   *
   * @param message - Human-readable error message.
   * @param code - Unique error code.
   * @param context - Additional error context.
   */
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ExoError";
    this.code = code;
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExoError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
    };
  }
}

/**
 * Error thrown when input validation fails.
 *
 * Contains detailed information about which fields failed validation
 * and why, making it easier to provide feedback to users or agents.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid input', [
 *   { field: 'city', message: 'Expected string, received number' },
 * ]);
 * ```
 */
export class ValidationError extends ExoError {
  /**
   * Array of field-level validation errors.
   */
  public readonly fieldErrors: Array<{
    field: string;
    message: string;
  }>;

  /**
   * Creates a new ValidationError instance.
   *
   * @param message - Human-readable error message.
   * @param fieldErrors - Array of field-level validation errors.
   * @param context - Additional error context.
   */
  constructor(
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

/**
 * Error thrown when tool execution fails.
 *
 * Wraps the original error with additional context about
 * the tool that failed and the input that was provided.
 */
export class ExecutionError extends ExoError {
  /**
   * The original error that caused the execution failure.
   */
  public override readonly cause: Error | undefined;

  /**
   * Creates a new ExecutionError instance.
   *
   * @param message - Human-readable error message.
   * @param cause - The original error that caused the failure.
   * @param context - Additional error context.
   */
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(message, "EXECUTION_ERROR", context);
    this.name = "ExecutionError";
    this.cause = cause;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
          }
        : undefined,
    };
  }
}

/**
 * Error thrown when a high-risk tool is called without proper privileges.
 *
 * This error is part of the "Exoskeleton" safety layer and is thrown when:
 * - A tool with `riskLevel: 'HIGH'` is executed
 * - The user does not have an 'admin' role
 * - The `sudo` execution option is not set to true
 *
 * @example
 * ```typescript
 * try {
 *   await nukeDatabaseTool.execute({}, { user: { id: '1', role: 'user' } });
 * } catch (error) {
 *   if (error instanceof RiskViolationError) {
 *     console.log('Admin privileges required for this operation');
 *   }
 * }
 * ```
 */
export class RiskViolationError extends ExoError {
  /**
   * The name of the tool that was attempted.
   */
  public readonly toolName: string;

  /**
   * The required role to execute this tool.
   */
  public readonly requiredRole: string;

  /**
   * The actual role of the user who attempted execution.
   */
  public readonly actualRole: string | undefined;

  /**
   * Creates a new RiskViolationError instance.
   *
   * @param toolName - The name of the tool that was attempted.
   * @param requiredRole - The role required to execute the tool.
   * @param actualRole - The actual role of the user.
   * @param context - Additional error context.
   */
  constructor(
    toolName: string,
    requiredRole: string = "admin",
    actualRole?: string,
    context?: Record<string, unknown>,
  ) {
    super(
      `Risk violation: Tool "${toolName}" requires "${requiredRole}" role, but user has "${actualRole ?? "none"}"`,
      "RISK_VIOLATION",
      context,
    );
    this.name = "RiskViolationError";
    this.toolName = toolName;
    this.requiredRole = requiredRole;
    this.actualRole = actualRole;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RiskViolationError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      toolName: this.toolName,
      requiredRole: this.requiredRole,
      actualRole: this.actualRole,
    };
  }
}

/**
 * Error thrown when a tool requires explicit human confirmation.
 *
 * This error is part of the "Human-in-the-loop" flow and is thrown when:
 * - A tool has `requiresConfirmation: true` in its config
 * - The `confirmed` execution option is not set to true
 *
 * The frontend/agent can catch this error and prompt the user for confirmation,
 * then re-execute with `{ confirmed: true }`.
 *
 * @example
 * ```typescript
 * try {
 *   await transferMoneyTool.execute({ amount: 1000 }, context);
 * } catch (error) {
 *   if (error instanceof ConfirmationRequiredError) {
 *     const confirmed = await askUser('Are you sure you want to transfer $1000?');
 *     if (confirmed) {
 *       await transferMoneyTool.execute({ amount: 1000 }, context, { confirmed: true });
 *     }
 *   }
 * }
 * ```
 */
export class ConfirmationRequiredError extends ExoError {
  /**
   * The name of the tool that requires confirmation.
   */
  public readonly toolName: string;

  /**
   * The validated arguments that will be used if confirmed.
   */
  public readonly pendingArgs: unknown;

  /**
   * Creates a new ConfirmationRequiredError instance.
   *
   * @param toolName - The name of the tool requiring confirmation.
   * @param pendingArgs - The arguments that were validated and are pending confirmation.
   * @param context - Additional error context.
   */
  constructor(
    toolName: string,
    pendingArgs: unknown,
    context?: Record<string, unknown>,
  ) {
    super(
      `Confirmation required: Tool "${toolName}" requires explicit user confirmation before execution`,
      "CONFIRMATION_REQUIRED",
      context,
    );
    this.name = "ConfirmationRequiredError";
    this.toolName = toolName;
    this.pendingArgs = pendingArgs;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfirmationRequiredError);
    }
  }

  /**
   * Converts the error to a JSON-serializable object.
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      toolName: this.toolName,
      pendingArgs: this.pendingArgs,
    };
  }
}
