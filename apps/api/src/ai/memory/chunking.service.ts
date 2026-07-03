import { Injectable } from "@nestjs/common";

export interface Chunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
}

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 128;
const CHARS_PER_TOKEN = 4;

@Injectable()
export class ChunkingService {
  chunkText(text: string, maxChunkSize = DEFAULT_MAX_TOKENS): Chunk[] {
    const maxChars = maxChunkSize * CHARS_PER_TOKEN;
    if (text.length <= maxChars) {
      return [{ text, index: 0, startChar: 0, endChar: text.length, tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN) }];
    }

    const chunks: Chunk[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxChars, text.length);

      // Try paragraph boundary
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf("\n\n", end);
        if (paragraphBreak > start + maxChars * 0.5) {
          end = paragraphBreak + 2;
        }
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          index: chunks.length,
          startChar: start,
          endChar: end,
          tokenEstimate: Math.ceil(chunkText.length / CHARS_PER_TOKEN),
        });
      }

      const overlapChars = DEFAULT_OVERLAP_TOKENS * CHARS_PER_TOKEN;
      start = Math.max(end - overlapChars, start + 1);
      if (start >= end) start = end;
    }

    return chunks;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }
}
