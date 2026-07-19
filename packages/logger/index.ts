// @repo/logger — shared logging utility

interface Logger {
  info: (msg: unknown, ...args: unknown[]) => void;
  warn: (msg: unknown, ...args: unknown[]) => void;
  error: (msg: unknown, ...args: unknown[]) => void;
  debug: (msg: unknown, ...args: unknown[]) => void;
}

function createServerLogger(): Logger {
  return {
    info: (msg: unknown, ...args: unknown[]) => {
      console.log("[INFO]", msg, ...args);
    },
    warn: (msg: unknown, ...args: unknown[]) => {
      console.warn("[WARN]", msg, ...args);
    },
    error: (msg: unknown, ...args: unknown[]) => {
      console.error("[ERROR]", msg, ...args);
    },
    debug: (msg: unknown, ...args: unknown[]) => {
      console.debug("[DEBUG]", msg, ...args);
    },
  };
}

let _logger: Logger | null = null;

export function serverLogger(): Logger {
  if (!_logger) {
    _logger = createServerLogger();
  }
  return _logger;
}

const defaultLogger = serverLogger();

export default defaultLogger;

export function withLogging(handler: any) {
  return handler;
}

export type { Logger as ServerLogger };
