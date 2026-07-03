import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

interface StreamChunk {
  message?: { content?: string };
  done?: boolean;
}

@Injectable()
export class OllamaService {
  private readonly ollamaUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl = this.configService.get("OLLAMA_URL") ?? "http://localhost:11434";
    this.timeoutMs = Number(this.configService.get("OLLAMA_TIMEOUT_MS") ?? 30_000);
  }

  async chat(messages: OllamaMessage[], opts: OllamaChatOptions = {}): Promise<string> {
    const response = await this.postChat(messages, { ...opts, stream: false });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const error = new Error(`Ollama chat error ${response.status}: ${errorText}`) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    return data.message?.content ?? "";
  }

  async *chatStream(messages: OllamaMessage[], opts: OllamaChatOptions = {}): AsyncIterable<string> {
    const response = await this.postChat(messages, { ...opts, stream: true });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const error = new Error(`Ollama stream error ${response.status}: ${errorText}`) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Ollama: no response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as StreamChunk;
            const content = chunk.message?.content ?? "";
            if (content) yield content;
            if (chunk.done) return;
          } catch {
            // skip malformed streaming chunks
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  }

  async embed(input: string | string[], opts: { model?: string } = {}): Promise<number[][]> {
    const model = opts.model ?? "nomic-embed-text:latest";
    const texts = Array.isArray(input) ? input : [input];
    const response = await this.withTimeout((signal) =>
      fetch(`${this.ollamaUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: texts }),
        signal,
      }),
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ollama embed error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.embeddings as number[][];
  }

  private async postChat(messages: OllamaMessage[], opts: OllamaChatOptions): Promise<Response> {
    const {
      model = DEFAULT_MODEL,
      system,
      temperature = 0.7,
      maxTokens = 4096,
      keepAlive = "1h",
    } = opts;

    const body: Record<string, unknown> = {
      model,
      messages,
      stream: !!opts.stream,
      options: { temperature, num_predict: maxTokens },
      keep_alive: keepAlive,
    };
    if (system) body.system = system;

    return this.withTimeout((signal) =>
      fetch(`${this.ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }),
    );
  }

  private async withTimeout(factory: (signal: AbortSignal) => Promise<Response>): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      return await factory(controller.signal);
    } catch (error) {
      if (timedOut) {
        const timeoutError = new Error(`Ollama request timed out after ${this.timeoutMs}ms`) as Error & { statusCode?: number };
        timeoutError.statusCode = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
