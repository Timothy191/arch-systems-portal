/**
 * Re-export the real Next.js 16 edge proxy so imports do not drift from apps/portal/proxy.ts.
 * Prefer importing from `apps/portal/proxy` (or relative `../../proxy`) in new code.
 */
export {
  proxy,
  isValidRedirect,
  normalizeRole,
  isTokenExpiredError,
} from "../../proxy";
