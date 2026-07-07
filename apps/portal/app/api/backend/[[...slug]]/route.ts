// AGENT-TRACE: Proxies /api/backend/* to the NestJS API so the browser talks to
// a single origin while dev orchestration runs the API on its own port.

import { NextRequest } from "next/server";
import { env } from "@/lib/env";

// TODO: Cache Components adoption - restore dynamic = "force-dynamic" behavior
// TODO: Cache Components adoption - restore runtime = "nodejs" behavior

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await context.params;
  const base = env.API_BASE_URL ?? "http://localhost:3004/api";
  const upstream = new URL(base);

  if (slug.length === 0) {
    return new Response("Missing API path", { status: 404 });
  }

  upstream.pathname = "/" + slug.join("/");
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const upstreamResponse = await fetch(upstream, {
    method: request.method,
    headers,
    body: IDEMPOTENT_METHODS.has(request.method) ? undefined : request.body,
    duplex: "half",
  } as RequestInit);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
