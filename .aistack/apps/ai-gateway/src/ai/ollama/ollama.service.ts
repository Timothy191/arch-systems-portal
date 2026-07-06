import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class OllamaService {
  private readonly ollamaUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.ollamaUrl =
      this.configService.get("OLLAMA_URL") ?? "http://localhost:11434";
    this.timeoutMs = Number(
      this.configService.get("OLLAMA_TIMEOUT_MS") ?? 30_000,
    );
  }

  async embed(
    input: string | string[],
    opts: { model?: string } = {},
  ): Promise<number[][]> {
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

  private async withTimeout(
    factory: (signal: AbortSignal) => Promise<Response>,
  ): Promise<Response> {
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
        const timeoutError = new Error(
          `Ollama request timed out after ${this.timeoutMs}ms`,
        ) as Error & { statusCode?: number };
        timeoutError.statusCode = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

