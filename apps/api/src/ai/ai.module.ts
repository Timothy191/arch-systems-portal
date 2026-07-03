import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { OllamaService } from "./ollama/ollama.service";
import { EmbeddingsService } from "./ollama/embeddings.service";
import { MemoryService } from "./memory/memory.service";
import { ChunkingService } from "./memory/chunking.service";
import { ToolDispatchService } from "./tools/tool-dispatch.service";
import { ToolCacheService } from "./tools/tool-cache.service";
import { CostTrackerService } from "./cost-tracker.service";
import { AiRateLimiterService } from "./rate-limiter.service";
import { AgentGraphService } from "./agent-graph/agent-graph.service";

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    OllamaService,
    EmbeddingsService,
    MemoryService,
    ChunkingService,
    ToolDispatchService,
    ToolCacheService,
    CostTrackerService,
    AiRateLimiterService,
    AgentGraphService,
  ],
  exports: [
    AiService,
    OllamaService,
    EmbeddingsService,
    MemoryService,
    ToolDispatchService,
    CostTrackerService,
    AgentGraphService,
  ],
})
export class AiModule {}
