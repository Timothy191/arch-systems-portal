import { Injectable } from "@nestjs/common";
import { OllamaService } from "../ollama/ollama.service";

@Injectable()
export class EmbeddingsService {
  private readonly l1Cache = new Map<string, number[]>();
  private static readonly MAX_L1_ENTRIES = 512;

  constructor(private readonly ollamaService: OllamaService) {}

  async generateEmbedding(text: string, userId: string): Promise<number[]> {
    const cacheKey = `${userId}:${this.hashCode(text)}`;
    const cached = this.l1Cache.get(cacheKey);
    if (cached) return cached;

    const vectors = await this.ollamaService.embed(text, { model: "nomic-embed-text:latest" });
    const vector = vectors[0] ?? [];

    if (vector.length > 0) {
      if (this.l1Cache.size >= EmbeddingsService.MAX_L1_ENTRIES) {
        const firstKey = this.l1Cache.keys().next().value;
        if (firstKey !== undefined) this.l1Cache.delete(firstKey);
      }
      this.l1Cache.set(cacheKey, vector);
    }

    return vector;
  }

  async batchGenerateEmbeddings(texts: string[], userId: string): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = new Array(texts.length);
    const pendingIndices: number[] = [];
    const pendingTexts: string[] = [];

    // L1 check
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = `${userId}:${this.hashCode(texts[i]!)}`;
      const cached = this.l1Cache.get(cacheKey);
      if (cached) {
        results[i] = cached;
      } else {
        pendingIndices.push(i);
        pendingTexts.push(texts[i]!);
      }
    }

    if (pendingTexts.length > 0) {
      const fresh = await this.ollamaService.embed(pendingTexts, { model: "nomic-embed-text:latest" });
      for (let i = 0; i < pendingTexts.length; i++) {
        const origIdx = pendingIndices[i]!;
        const vector = fresh[i] ?? [];
        results[origIdx] = vector;

        if (vector.length > 0) {
          const cacheKey = `${userId}:${this.hashCode(pendingTexts[i]!)}`;
          this.l1Cache.set(cacheKey, vector);
        }
      }
    }

    return results;
  }

  clearCache(): void {
    this.l1Cache.clear();
  }

  private hashCode(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}
