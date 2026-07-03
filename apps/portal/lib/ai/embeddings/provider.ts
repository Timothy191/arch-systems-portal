import { ollamaEmbed } from "../ollama";
import { APIError } from "@/lib/errors/error-classes";

const EMBEDDING_DIMENSIONS = 768;
const EMBED_MODEL = "nomic-embed-text:latest";

export { EMBEDDING_DIMENSIONS };

class OllamaEmbeddingProvider {
  name = "ollama";

  async generate(text: string): Promise<number[]> {
    const result = await ollamaEmbed(text, { model: EMBED_MODEL });
    const vector = result[0];
    if (!vector) {
      throw new APIError("Ollama returned empty embedding data", {
        statusCode: 502,
        context: { provider: "ollama", reason: "empty_response" },
      });
    }
    return vector;
  }

  async batchGenerate(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return ollamaEmbed(texts, { model: EMBED_MODEL });
  }
}

let primaryProvider: OllamaEmbeddingProvider | null = null;

export function getPrimaryProvider(): OllamaEmbeddingProvider {
  if (!primaryProvider) {
    primaryProvider = new OllamaEmbeddingProvider();
  }
  return primaryProvider;
}
