import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { FastifyReply } from "fastify";

/**
 * Global exception filter with structured error logging.
 * Captures all unhandled exceptions, logs them with context, and
 * integrates with Sentry when configured.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");
  private sentryInitialized = false;

  constructor() {
    this.initSentry();
  }

  private initSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    try {
      // Dynamic import to avoid hard dependency when Sentry is not installed
      import("@sentry/node").then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV ?? "development",
          tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
          beforeSend(event: any) {
            // Filter out expected errors (4xx)
            if (event.exception?.values?.[0]) {
              const value = event.exception.values[0];
              if (value.type === "HttpException" || value.type === "BadRequestException") {
                return null;
              }
            }
            return event;
          },
        });
        this.sentryInitialized = true;
        this.logger.log("Sentry initialized for API server");
      }).catch(() => {
        this.logger.warn("@sentry/node not installed — Sentry disabled");
      });
    } catch {
      // Sentry not available, continue without it
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errorDetails: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        errorDetails = resp;
      } else {
        message = String(exceptionResponse);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Structured log entry
    const logEntry = {
      method: request.method,
      url: request.url,
      status,
      message,
      timestamp: new Date().toISOString(),
      userAgent: request.headers["user-agent"],
      ip: request.headers["x-forwarded-for"] ?? request.ip,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`[${request.method}] ${request.url} ${status}: ${message}`);
    }

    // Report to Sentry for 5xx errors
    if (status >= 500 && this.sentryInitialized && exception instanceof Error) {
      import("@sentry/node").then((Sentry) => {
        Sentry.captureException(exception, {
          tags: { method: request.method, url: request.url, status: String(status) },
          extra: logEntry,
        });
      }).catch(() => {});
    }

    if (!response.sent) {
      response.status(status).send({
        statusCode: status,
        message,
        ...errorDetails,
      });
    }
  }
}
