import { APIError } from "@/lib/errors/error-classes";

/**
 * Ollama provider — simple fetch-based HTTP calls to local Ollama server.
 * No SDK wrapper; uses native fetch against /api/chat and /api/embed.
 *
 * All outbound calls carry a hard timeout to prevent unbounded hangs in
 * serverless environments (see agents.md: "Every external request must have
 * a strict timeout").
 */

export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_TIMEOUT_MS = Number(
  process.env.OLLAMA_TIMEOUT_MS ?? 30_000,
);

export const DEFAULT_MODEL = "gemma4:latest";

export type OllamaChatOptions = {
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  keepAlive?: string | number;
};

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface ChatRequestBody {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options: { temperature: number; num_predict: number };
  keep_alive: string | number;
  system?: string;
}

/**
 * Race a fetch operation against a hard timeout and abort the underlying
 * request on timeout so the HTTP connection is released (not just the await).
 *
 * GAP-4: previous `withTimeout(promise, ms)` only abandoned the await — the
 * actual `fetch()` was left running until the server closed the socket,
 * leaking connections in serverless.
 */
async function withTimeout<T>(
  factory: (_signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await factory(controller.signal);
  } catch (err) {
    if (timedOut) {
      const error = new Error(
        `Ollama request timed out after ${timeoutMs}ms`,
      ) as Error & { statusCode?: number };
      error.statusCode = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function buildChatBody(
  messages: OllamaMessage[],
  opts: OllamaChatOptions,
): ChatRequestBody {
  const {
    model = DEFAULT_MODEL,
    system,
    temperature = 0.7,
    maxTokens = 4096,
    keepAlive = "1h",
  } = opts;

  const body: ChatRequestBody = {
    model,
    messages,
    stream: !!opts.stream,
    options: { temperature, num_predict: maxTokens },
    keep_alive: keepAlive,
  };
  if (system) {
    body.system = system;
  }
  return body;
}

async function postChat(
  messages: OllamaMessage[],
  opts: OllamaChatOptions,
): Promise<Response> {
  return withTimeout(
    (signal) =>
      fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildChatBody(messages, opts)),
        signal,
      }),
    OLLAMA_TIMEOUT_MS,
  );
}

async function parseErrorText(res: Response): Promise<string> {
  return res.text().catch(() => "");
}

/**
 * POST /api/chat — chat completion (non-streaming).
 * Returns the full assistant message text.
 */
export async function ollamaChat(
  messages: OllamaMessage[],
  opts: OllamaChatOptions = {},
): Promise<string> {
  const res = await postChat(messages, { ...opts, stream: false });

  if (!res.ok) {
    const errText = await parseErrorText(res);
    const error = new Error(
      `Ollama chat error ${res.status}: ${errText}`,
    ) as Error & { statusCode?: number };
    error.statusCode = res.status;
    throw error;
  }

  const data = await res.json();
  return data.message?.content ?? "";
}

interface StreamChunk {
  message?: { content?: string };
  done?: boolean;
}

function decodeChunk(value: Uint8Array, decoder: TextDecoder): string {
  return decoder.decode(value, { stream: true });
}

function parseStreamBuffer(
  buffer: string,
): {
  chunks: Array<{ text: string; done: boolean }>;
  remainder: string;
} {
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";
  const chunks: Array<{ text: string; done: boolean }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const chunk = JSON.parse(trimmed) as StreamChunk;
      const content = chunk.message?.content ?? "";
      chunks.push({ text: content, done: !!chunk.done });
    } catch {
      // skip malformed chunk
    }
  }

  return { chunks, remainder };
}

/**
 * POST /api/chat — streaming chat completion.
 * Returns an async iterator over text chunks.
 */
export async function* ollamaChatStream(
  messages: OllamaMessage[],
  opts: OllamaChatOptions = {},
): AsyncIterable<string> {
  // Race the fetch against the hard timeout so we abort the underlying
  // connection and don't leak a hanging request in serverless.
  const res = await postChat(messages, { ...opts, stream: true });

  if (!res.ok) {
    const errText = await parseErrorText(res);
    throw new APIError(`Ollama stream error ${res.status}: ${errText}`, {
      statusCode: res.status,
      endpoint: "/api/chat",
    });
  }

  const reader = res.body?.getReader();
  if (!reader)
    throw new APIError("Ollama: no response body", {
      statusCode: 502,
      endpoint: "/api/chat",
    });

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decodeChunk(value, decoder);
      const { chunks, remainder } = parseStreamBuffer(buffer);
      buffer = remainder;

      for (const chunk of chunks) {
        if (chunk.text) yield chunk.text;
        if (chunk.done) return;
      }
    }
  } finally {
    // Ensure the fetch reader is released when the generator is disposed
    // (e.g. client disconnects and ReadableStream.cancel() calls iterator.return()).
    reader.cancel().catch(() => {
      // ignore cancel errors
    });
  }
}

/**
 * POST /api/embed — embedding generation.
 * Returns a number[][] embedding vector for the given text(s).
 */
export async function ollamaEmbed(
  input: string | string[],
  opts: { model?: string } = {},
): Promise<number[][]> {
  const { model = DEFAULT_MODEL } = opts;
  const texts = Array.isArray(input) ? input : [input];

  const res = await withTimeout(
    (signal) =>
      fetch(`${OLLAMA_URL}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts }),
        signal,
      }),
    OLLAMA_TIMEOUT_MS,
  );

  if (!res.ok) {
    const errText = await parseErrorText(res);
    throw new APIError(`Ollama embed error ${res.status}: ${errText}`, {
      statusCode: res.status,
      endpoint: "/api/embed",
    });
  }

  const data = await res.json();
  return data.embeddings as number[][];
}
