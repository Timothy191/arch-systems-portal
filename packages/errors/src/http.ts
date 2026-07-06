import { AppError, ErrorOptions } from "./base";

export class AuthError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "AUTH_ERROR",
      statusCode: 401,
      ...options,
    });
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "FORBIDDEN_ERROR",
      statusCode: 403,
      ...options,
    });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "NOT_FOUND",
      statusCode: 404,
      ...options,
    });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "CONFLICT_ERROR",
      statusCode: 409,
      ...options,
    });
    this.name = "ConflictError";
  }
}

export class APIError extends AppError {
  public response?: Response;

  constructor(message: string, response?: Response);
  constructor(message: string, options?: ErrorOptions);
  constructor(message: string, responseOrOptions?: Response | ErrorOptions) {
    let resolvedOptions: ErrorOptions = { code: "API_ERROR" };
    let response: Response | undefined;

    if (responseOrOptions) {
      if (
        "status" in responseOrOptions &&
        typeof (responseOrOptions as any).status === "number"
      ) {
        response = responseOrOptions as Response;
        resolvedOptions.statusCode = response.status;
      } else {
        const { ...rest } = responseOrOptions as any;
        resolvedOptions = { ...resolvedOptions, ...rest };
      }
    }
    super(message, resolvedOptions);
    this.response = response;
    this.name = "APIError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "RATE_LIMIT_ERROR",
      statusCode: 429,
      ...options,
    });
    this.name = "RateLimitError";
  }
}

export class WebFetchError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      code: "WEB_FETCH_ERROR",
      statusCode: 502,
      ...options,
    });
    this.name = "WebFetchError";
  }
}
