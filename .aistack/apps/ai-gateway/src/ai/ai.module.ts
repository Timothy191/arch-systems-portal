import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { OllamaService } from "./ollama/ollama.service";
import { EmbeddingsService } from "./ollama/embeddings.service";
import { SurrealService } from "./ollama/surreal.service";
import { MemoryService } from "./memory/memory.service";
import { ChunkingService } from "./memory/chunking.service";
import { RagflowService } from "./rag/ragflow.service";
import { ToolDispatchService } from "./tools/tool-dispatch.service";
import { ToolCacheService } from "./tools/tool-cache.service";
import { CostTrackerService } from "./cost-tracker.service";
import { AiRateLimiterService } from "./rate-limiter.service";
import { AgentGraphService } from "./agent-graph/agent-graph.service";
import { AgentApiService } from "./agent-api.service";

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    OllamaService,
    EmbeddingsService,
    SurrealService,
    MemoryService,
    ChunkingService,
    RagflowService,
    ToolDispatchService,
    ToolCacheService,
    CostTrackerService,
    AiRateLimiterService,
    AgentGraphService,
    AgentApiService,
  ],
  exports: [
    AiService,
    OllamaService,
    EmbeddingsService,
    SurrealService,
    MemoryService,
    RagflowService,
    ToolDispatchService,
    CostTrackerService,
    AgentGraphService,
    AgentApiService,
  ],
})
export class AiModule {}
