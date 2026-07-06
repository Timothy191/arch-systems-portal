import { AppError, ErrorOptions } from "./base";

export class ValidationError extends AppError {
  constructor(
    message: string,
    options?: {
      field?: string;
      value?: unknown;
      context?: Record<string, unknown>;
      cause?: Error;
      [key: string]: any;
    },
  ) {
    const { field, value, context, ...rest } = options || {};
    super(message, {
      code: "VALIDATION_ERROR",
      statusCode: 400,
      context: {
        ...context,
        ...(field && { field }),
        ...(value !== undefined && { value }),
      },
      ...rest,
    });
    this.name = "ValidationError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "DATABASE_ERROR",
      statusCode: 500,
      ...options,
    });
    this.name = "DatabaseError";
  }
}
