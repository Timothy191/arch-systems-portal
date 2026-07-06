import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Using any at compile time to avoid ESM/CommonJS compilation resolution conflicts,
// while loading the ESM surrealdb module dynamically at runtime.
let SurrealConstructor: any;

@Injectable()
export class SurrealService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SurrealService.name);
  private client: any = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  getClient(): any {
    if (!this.client || !this.isConnected) {
      throw new Error("SurrealDB client is not connected");
    }
    return this.client;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  private async connect() {
    const url =
      this.configService.get<string>("SURREALDB_URL") ??
      "ws://localhost:8000/rpc";
    const ns = this.configService.get<string>("SURREALDB_NS") ?? "plantcor";
    const db = this.configService.get<string>("SURREALDB_DB") ?? "ai";
    const username = this.configService.get<string>("SURREALDB_USER") ?? "root";
    const password = this.configService.get<string>("SURREALDB_PASS") ?? "root";

    this.logger.log(
      `Connecting to SurrealDB at ${url} (ns: ${ns}, db: ${db})...`,
    );

    try {
      if (!SurrealConstructor) {
        const module = await (new Function(
          'return import("surrealdb")',
        )() as Promise<any>);
        SurrealConstructor = module.Surreal;
      }

      this.client = new SurrealConstructor();
      const connectPromise = this.client.connect(url, {
        namespace: ns,
        database: db,
        authentication: {
          username,
          password,
        },
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("SurrealDB connect timed out (5s)")),
          5000,
        ),
      );
      await Promise.race([connectPromise, timeout]);

      this.isConnected = true;
      this.logger.log("Successfully connected to SurrealDB");

      // Initialize table schemas and HNSW vector index
      await this.initializeSchema();
    } catch (err) {
      this.isConnected = false;
      this.logger.error(
        "Failed to connect to SurrealDB",
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.log("Disconnected from SurrealDB");
      } catch (err) {
        this.logger.error("Error disconnecting from SurrealDB", err);
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  private async initializeSchema() {
    if (!this.client) return;

    this.logger.log("Initializing SurrealDB schemas and indexes...");
    try {
      // Define schemafull table for memory embeddings
      await this.client.query(`
        DEFINE TABLE memory_embeddings SCHEMAFULL;
        DEFINE FIELD session_id TYPE string;
        DEFINE FIELD user_id TYPE string;
        DEFINE FIELD content TYPE string;
        DEFINE FIELD embedding TYPE array<float, 768>;
        DEFINE FIELD metadata TYPE object;
        DEFINE FIELD memory_type TYPE string;
        DEFINE FIELD created_at TYPE datetime DEFAULT time::now();

        -- Define HNSW vector index for cosine similarity
        DEFINE INDEX idx_memory_embeddings_hnsw ON memory_embeddings FIELDS embedding HNSW DIMENSION 768 DIST COSINE TYPE F32;
        -- Define BM25 full-text index for keyword search
        DEFINE INDEX idx_content ON memory_embeddings FIELDS content SEARCH ANALYZER english BM25;
      `);
      this.logger.log("SurrealDB schemas and indexes initialized successfully");
    } catch (err) {
      this.logger.error(
        "Failed to initialize SurrealDB schemas",
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
