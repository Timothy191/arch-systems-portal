import { Injectable, Logger } from "@nestjs/common";
import { OllamaService } from "../ollama/ollama.service";
import { SurrealService } from "../ollama/surreal.service";

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
    private readonly ollamaService: OllamaService,
    private readonly surrealService: SurrealService,
  ) {}

  async storeMemory(input: {
    sessionId: string;
    userId: string;
    content: string;
    memoryType: MemoryType;
    metadata?: Record<string, unknown>;
  }): Promise<MemoryEntry> {
    const embedding = await this.generateEmbedding(input.content);

    try {
      const results = (await this.surrealService.getClient().query(
        `INSERT INTO memory_embeddings {
          session_id: $session_id,
          user_id: $user_id,
          content: $content,
          embedding: $embedding,
          metadata: $metadata,
          memory_type: $memory_type,
          created_at: time::now()
        };`,
        {
          session_id: input.sessionId,
          user_id: input.userId,
          content: input.content,
          embedding,
          metadata: input.metadata ?? {},
          memory_type: input.memoryType,
        },
      )) as any[];

      const data = results[0]?.[0];
      if (!data) {
        throw new Error("Memory insertion returned no data");
      }

      return this.mapRowToEntry(data);
    } catch (error) {
      this.logger.error(
        "Memory storage failed",
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error("Memory storage failed");
    }
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
      const limit = options.limit ?? 10;

      const results = (await this.surrealService.getClient().query(
        `SELECT *,
           vector::similarity::cosine(embedding, $query_embedding) AS similarity
         FROM memory_embeddings
         WHERE user_id = $user_id
           AND ($session_id = NULL OR $session_id = NONE OR session_id = $session_id)
           AND ($memory_type = NULL OR $memory_type = NONE OR memory_type = $memory_type)
         ORDER BY similarity DESC
         LIMIT $limit;`,
        {
          query_embedding: embedding,
          user_id: options.userId,
          session_id: options.sessionId ?? null,
          memory_type: options.memoryType ?? null,
          limit,
        },
      )) as any[];

      const rows = (results[0] ?? []) as any[];
      return rows.map((row: any) => ({
        ...this.mapRowToEntry(row),
        similarity: row.similarity as number,
        combinedScore: row.similarity as number,
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
      const results = (await this.surrealService.getClient().query(
        `SELECT * FROM memory_embeddings
         WHERE session_id = $session_id
           AND user_id = $user_id
           AND memory_type = 'episodic'
         ORDER BY created_at DESC
         LIMIT $limit;`,
        {
          session_id: sessionId,
          user_id: userId,
          limit,
        },
      )) as any[];

      const rows = (results[0] ?? []) as any[];
      return rows.map((r: any) => this.mapRowToEntry(r));
    } catch (err) {
      this.logger.warn("Failed to get conversation history", err);
      return [];
    }
  }

  formatMemoriesForContext(memories: MemoryEntry[]): string {
    if (memories.length === 0) return "";

    const lines = memories.map((m) => {
      const timestamp = new Date(m.createdAt).toLocaleString();
      const prefix =
        m.memoryType === "episodic" ? `[${timestamp}]` : `[${m.memoryType}]`;
      return `${prefix} ${m.content}`;
    });

    return `Relevant context from memory:\n${lines.join("\n")}\n`;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const vectors = await this.ollamaService.embed(text, {
        model: "nomic-embed-text:latest",
      });
      return vectors[0] ?? [];
    } catch {
      return [];
    }
  }

  private mapRowToEntry(row: Record<string, any>): MemoryEntry {
    return {
      id:
        typeof row.id === "object" && row.id
          ? row.id.toString()
          : String(row.id),
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      content: row.content as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      memoryType: row.memory_type as MemoryType,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : typeof row.created_at === "string"
            ? row.created_at
            : new Date(String(row.created_at)).toISOString(),
    };
  }
}
