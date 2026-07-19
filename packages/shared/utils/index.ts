// Placeholder exports for @repo/shared/utils

export function env() {
  return process.env;
}

export function resetEnv() {
  // Placeholder implementation
}

export function getEnvErrors() {
  return [];
}

export function withCache<T>(fn: () => T, _options?: unknown): T {
  return fn();
}