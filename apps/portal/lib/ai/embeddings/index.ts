/**
 * Public embedding service API.
 *
 * Multi-tier caching:
 *   L1 in-process Map <-> L2 Postgres cache <-> Ollama provider.
 */

import { logError } from "@/lib/errors/error-logger";
import {
  getCachedEmbedding as getL1,
  setCachedEmbedding as setL1,
  clearEmbeddingCache,
} from "./l1-cache";
import {
  getDbCachedEmbedding,
  saveDbCachedEmbedding,
  getDbCachedEmbeddings,
  saveDbCachedEmbeddings,
} from "./l2-cache";
import { getPrimaryProvider } from "./provider";
import { computeHash, computeHashes } from "./hash";

export { clearEmbeddingCache };
export { EMBEDDING_DIMENSIONS } from "./provider";

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(
  text: string,
  userId: string,
): Promise<number[]> {
  const hash = computeHash(text);
  const cached = getL1(hash, userId);
  if (cached !== undefined) return cached;

  const dbCached = await getDbCachedEmbedding(hash, userId);
  if (dbCached !== undefined) {
    setL1(hash, userId, dbCached);
    return dbCached;
  }

  try {
    const vector = await getPrimaryProvider().generate(text);
    setL1(hash, userId, vector);
    await saveDbCachedEmbedding(hash, userId, vector);
    return vector;
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_primary_failed",
    });
    throw err;
  }
}

/**
 * Generate embeddings for multiple texts in one batch call.
 * Caching is resolved in bulk to minimize DB roundtrips.
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  userId: string,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const hashes = computeHashes(texts);
    const results: number[][] = new Array(texts.length);
    const pendingIndices: number[] = [];
    const pendingHashes: string[] = [];

    // Step 1: L1 cache check
    for (let i = 0; i < texts.length; i++) {
      const hash = hashes[i]!;
      const cached = getL1(hash, userId);
      if (cached !== undefined) {
        results[i] = cached;
      } else {
        pendingIndices.push(i);
        pendingHashes.push(hash);
      }
    }

    if (pendingIndices.length === 0) {
      return results;
    }

    // Step 2: L2 Database cache check (bulk query)
    const dbHits = await getDbCachedEmbeddings(pendingHashes, userId);

    const needsGenerationIndices: number[] = [];
    const needsGenerationTexts: string[] = [];

    for (const idx of pendingIndices) {
      const hash = hashes[idx]!;
      const dbCached = dbHits.get(hash);
      if (dbCached !== undefined) {
        results[idx] = dbCached;
        setL1(hash, userId, dbCached);
      } else {
        needsGenerationIndices.push(idx);
        needsGenerationTexts.push(texts[idx]!);
      }
    }

    // Step 3: Local LLM generation for remaining misses
    if (needsGenerationTexts.length > 0) {
      const fresh =
        await getPrimaryProvider().batchGenerate(needsGenerationTexts);

      const dbInsertRows: {
        text_hash: string;
        user_id: string;
        embedding: number[];
      }[] = [];

      needsGenerationTexts.forEach((text, i) => {
        const origIdx = needsGenerationIndices[i]!;
        const vector = fresh[i];
        if (vector !== undefined) {
          const hash = hashes[origIdx]!;
          results[origIdx] = vector;
          setL1(hash, userId, vector);
          dbInsertRows.push({
            text_hash: hash,
            user_id: userId,
            embedding: vector,
          });
        }
      });

      await saveDbCachedEmbeddings(dbInsertRows);
    }

    return results;
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_batch_primary_failed",
    });
    // Graceful degradation: individual calls
    return Promise.all(texts.map((t) => generateEmbedding(t, userId)));
  }
}
