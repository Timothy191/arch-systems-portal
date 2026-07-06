export interface ErrorOptions {
  code?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  cause?: Error;
  [key: string]: any;
}

export class AppError extends Error {
  public code?: string;
  public statusCode?: number;
  public context?: Record<string, unknown>;
  public cause?: Error;

  constructor(message: string, code?: string, statusCode?: number);
  constructor(message: string, options?: ErrorOptions);
  constructor(
    message: string,
    codeOrOptions?: string | ErrorOptions,
    statusCode?: number,
  ) {
    super(message);
    this.name = "AppError";

    if (typeof codeOrOptions === "string") {
      this.code = codeOrOptions;
      this.statusCode = statusCode;
    } else if (codeOrOptions && typeof codeOrOptions === "object") {
      this.code = codeOrOptions.code;
      this.statusCode = codeOrOptions.statusCode;
      this.cause = codeOrOptions.cause;
      this.context = codeOrOptions.context;

      // Capture any additional properties in the context
      const {
        code: _,
        statusCode: __,
        context: ___,
        cause: ____,
        ...extra
      } = codeOrOptions;
      if (Object.keys(extra).length > 0) {
        this.context = {
          ...this.context,
          ...extra,
        };
      }
    }
  }
}
