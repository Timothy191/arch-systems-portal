/**
 * Error classes aligned with the @repo/errors API.
 *
 * AGENT-TRACE: These are local replacements for the @repo/errors package.
 * All concrete error classes accept an optional options object as the second
 * argument so callers can pass `{ statusCode, context, cause, ...extra }` in
 * one bag. Extra keys are merged into `context` to keep call sites concise.
 */
/* eslint-disable no-unused-vars */
// Overload signatures declare the public constructor API; ESLint flags their
// parameters as unused because only the implementation body counts them.

interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  cause?: unknown;
  [key: string]: unknown;
}

function resolveOptions(
  codeOrOptions?: string | AppErrorOptions,
  maybeStatusCode?: number,
): Required<
  Pick<AppErrorOptions, "code" | "statusCode" | "context" | "cause">
> &
  Record<string, unknown> {
  if (typeof codeOrOptions === "string") {
    return {
      code: codeOrOptions,
      statusCode: maybeStatusCode ?? 500,
      context: {},
      cause: undefined,
    };
  }

  const options = codeOrOptions ?? {};
  const { code, statusCode, context, cause, ...extra } = options;
  return {
    code: code ?? "APP_ERROR",
    statusCode: statusCode ?? 500,
    context: {
      ...context,
      ...(Object.keys(extra).length > 0 ? extra : {}),
    },
    cause,
  };
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public context: Record<string, unknown>;
  public cause?: unknown;

  constructor(message: string, code?: string, statusCode?: number);
  constructor(message: string, options?: AppErrorOptions);
  constructor(
    message: string,
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    const resolved = resolveOptions(codeOrOptions, statusCode);
    this.code = resolved.code;
    this.statusCode = resolved.statusCode;
    this.context = resolved.context;
    this.cause = resolved.cause;
  }
}

export class APIError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message: string, options?: AppErrorOptions);
  constructor(
    message: string,
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "API_ERROR" : resolved.code,
    });
  }
}

export class AuthError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message?: string, options?: AppErrorOptions);
  constructor(
    message: string = "Authentication failed",
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "AUTH_ERROR" : resolved.code,
      statusCode: resolved.statusCode === 500 ? 401 : resolved.statusCode,
    });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message: string, options?: AppErrorOptions);
  constructor(
    message: string,
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "DATABASE_ERROR" : resolved.code,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message: string, options?: AppErrorOptions);
  constructor(
    message: string,
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "VALIDATION_ERROR" : resolved.code,
      statusCode: resolved.statusCode === 500 ? 400 : resolved.statusCode,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message?: string, options?: AppErrorOptions);
  constructor(
    message: string = "Resource not found",
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "NOT_FOUND" : resolved.code,
      statusCode: resolved.statusCode === 500 ? 404 : resolved.statusCode,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message?: string, options?: AppErrorOptions);
  constructor(
    message: string = "Resource conflict",
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "CONFLICT" : resolved.code,
      statusCode: resolved.statusCode === 500 ? 409 : resolved.statusCode,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code?: string, statusCode?: number);
  constructor(message?: string, options?: AppErrorOptions);
  constructor(
    message: string = "Access forbidden",
    codeOrOptions?: string | AppErrorOptions,
    statusCode?: number,
  ) {
    const resolved = resolveOptions(codeOrOptions, statusCode);
    super(message, {
      ...resolved,
      code: resolved.code === "APP_ERROR" ? "FORBIDDEN" : resolved.code,
      statusCode: resolved.statusCode === 500 ? 403 : resolved.statusCode,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}
