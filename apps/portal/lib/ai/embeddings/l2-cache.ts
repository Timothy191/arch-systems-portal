/**
 * L2 persistent embedding cache backed by Supabase `embedding_cache`.
 *
 * The table stores vectors either as `number[]` (Postgres array) or a textual
 * representation depending on the schema version, so we normalize both on read.
 */

import { createServerSupabaseClient } from "@repo/supabase/server";
import { logError } from "@/lib/errors/error-logger";

interface EmbeddingCacheRow {
  text_hash: string;
  embedding: unknown;
}

function parseVector(raw: unknown): number[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    const clean = raw.replace(/[[\]\s]/g, "");
    return clean.split(",").map(Number);
  }
  return undefined;
}

export async function getDbCachedEmbedding(
  hash: string,
  userId: string,
): Promise<number[] | undefined> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("embedding_cache")
      .select("embedding")
      .eq("text_hash", hash)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logError(new Error(error.message), {
        context: "embedding_db_cache_lookup_failed",
        hash,
        userId,
      });
      return undefined;
    }
    return parseVector(data?.embedding);
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_db_cache_lookup_exception",
      hash,
      userId,
    });
    return undefined;
  }
}

export async function saveDbCachedEmbedding(
  hash: string,
  userId: string,
  vector: number[],
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("embedding_cache").insert({
      text_hash: hash,
      user_id: userId,
      embedding: vector,
    });

    if (error) {
      // Postgres error code 23505 is unique violation (ON CONFLICT DO NOTHING equivalent)
      if (error.code === "23505") {
        return;
      }
      logError(new Error(error.message), {
        context: "embedding_db_cache_insert_failed",
        hash,
        userId,
      });
    }
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_db_cache_insert_exception",
      hash,
      userId,
    });
  }
}

export async function getDbCachedEmbeddings(
  hashes: string[],
  userId: string,
): Promise<Map<string, number[]>> {
  if (hashes.length === 0) return new Map();

  const hits = new Map<string, number[]>();
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("embedding_cache")
      .select("text_hash, embedding")
      .eq("user_id", userId)
      .in("text_hash", hashes);

    if (error) {
      logError(new Error(error.message), {
        context: "embedding_batch_db_lookup_failed",
        userId,
      });
      return hits;
    }

    for (const row of data ?? []) {
      const vector = parseVector((row as EmbeddingCacheRow).embedding);
      if (vector) {
        hits.set((row as EmbeddingCacheRow).text_hash, vector);
      }
    }
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_batch_db_lookup_failed",
      userId,
    });
  }
  return hits;
}

export async function saveDbCachedEmbeddings(
  rows: { text_hash: string; user_id: string; embedding: number[] }[],
): Promise<void> {
  if (rows.length === 0) return;
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from("embedding_cache").insert(rows);
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "embedding_batch_db_insert_failed",
      userId: rows[0]?.user_id,
    });
  }
}
