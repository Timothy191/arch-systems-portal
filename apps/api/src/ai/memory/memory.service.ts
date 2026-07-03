import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../../supabase/supabase.constants";
import { OllamaService } from "../ollama/ollama.service";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryType = "episodic" | "semantic";

export interface MemoryEntry {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  metadata: Record<string, unknown>;
  memoryType: MemoryType;
  createdAt: string;
  similarity?: number;
  combinedScore?: number;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly ollamaService: OllamaService,
  ) {}

  async storeMemory(input: {
    sessionId: string;
    userId: string;
    content: string;
    memoryType: MemoryType;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryEntry> {
    const embedding = await this.generateEmbedding(input.content);

    const { data, error } = await this.supabase
      .from("memory_embeddings")
      .insert({
        session_id: input.sessionId,
        user_id: input.userId,
        content: input.content,
        embedding,
        metadata: input.metadata ?? {},
        memory_type: input.memoryType,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Memory storage failed", error.message);
      throw new Error("Memory storage failed");
    }

    return this.mapRowToEntry(data);
  }

  async retrieveRelevantMemories(options: {
    userId: string;
    query: string;
    sessionId?: string;
    memoryType?: MemoryType;
    limit?: number;
  }): Promise<MemoryEntry[]> {
    try {
      const embedding = await this.generateEmbedding(options.query);

      const { data, error } = await this.supabase.rpc("search_memories_hybrid", {
        query_embedding: embedding,
        query_text: options.query,
        p_user_id: options.userId,
        p_session_id: options.sessionId ?? null,
        p_memory_type: options.memoryType ?? null,
        match_count: options.limit ?? 10,
        semantic_weight: 0.6,
        keyword_weight: 0.2,
        temporal_weight: 0.2,
      });

      if (error) {
        this.logger.warn("Hybrid search failed, falling back to semantic", error.message);
        return this.retrieveSemanticMemories(options);
      }

      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        sessionId: row.session_id as string,
        userId: options.userId,
        content: row.content as string,
        metadata: row.metadata as Record<string, unknown>,
        memoryType: row.memory_type as MemoryType,
        createdAt: row.created_at as string,
        combinedScore: row.combined_score as number,
      }));
    } catch (err) {
      this.logger.warn("Memory retrieval failed", err);
      return [];
    }
  }

  async getConversationHistory(
    sessionId: string,
    userId: string,
    limit = 20,
  ): Promise<MemoryEntry[]> {
    try {
      const { data, error } = await this.supabase.rpc("get_conversation_history", {
        p_session_id: sessionId,
        p_user_id: userId,
        message_limit: limit,
      });

      if (error || !data) {
        const { data: fallbackData } = await this.supabase
          .from("memory_embeddings")
          .select("id, session_id, content, metadata, memory_type, created_at")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
          .eq("memory_type", "episodic")
          .order("created_at", { ascending: false })
          .limit(limit);
        return (fallbackData ?? []).map((r) => this.mapRowToEntry(r));
      }

      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        sessionId,
        userId,
        content: row.content as string,
        metadata: row.metadata as Record<string, unknown>,
        memoryType: "episodic" as MemoryType,
        createdAt: row.created_at as string,
      }));
    } catch {
      return [];
    }
  }

  formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return "";

    const lines = memories.map((m) => {
      const timestamp = new Date(m.createdAt).toLocaleString();
      const prefix = m.memoryType === "episodic" ? `[${timestamp}]` : `[${m.memoryType}]`;
      return `${prefix} ${m.content}`;
    });

    return `Relevant context from memory:\n${lines.join("\n")}\n`;
  }

  private async retrieveSemanticMemories(options: {
    userId: string;
    query: string;
    sessionId?: string;
    memoryType?: MemoryType;
    limit?: number;
  }): Promise<MemoryEntry[]> {
    try {
      const embedding = await this.generateEmbedding(options.query);
      const { data, error } = await this.supabase.rpc("search_memories_semantic", {
        query_embedding: embedding,
        p_user_id: options.userId,
        p_session_id: options.sessionId ?? null,
        p_memory_type: options.memoryType ?? null,
        match_count: options.limit ?? 10,
        similarity_threshold: 0.7,
      });

      if (error) return [];

      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        sessionId: row.session_id as string,
        userId: options.userId,
        content: row.content as string,
        metadata: row.metadata as Record<string, unknown>,
        memoryType: row.memory_type as MemoryType,
        createdAt: row.created_at as string,
        similarity: row.similarity as number,
      }));
    } catch {
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const vectors = await this.ollamaService.embed(text, { model: "nomic-embed-text:latest" });
      return vectors[0] ?? [];
    } catch {
      return [];
    }
  }

  private mapRowToEntry(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      content: row.content as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      memoryType: row.memory_type as MemoryType,
      createdAt: row.created_at as string,
    };
  }
}
