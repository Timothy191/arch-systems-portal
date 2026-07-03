import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { cacheWrap } from "@repo/redis/cache";
import type { RedisClientType } from "redis";

interface ExternalTool {
  name: string;
  displayName: string;
  url: string;
  description: string;
  icon: string;
  color: string;
}

export interface ToolStatus extends ExternalTool {
  status: "online" | "offline" | "unknown";
  responseTime?: number;
}

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);
  private readonly externalTools: ExternalTool[];

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {
    this.externalTools = [
      {
        name: "n8n",
        displayName: "n8n",
        url: this.configService.get("N8N_URL") ?? "http://localhost:5678",
        description:
          "Workflow automation and integration platform — build no-code automations with 400+ integrations",
        icon: "Workflow",
        color: "#ff6d5a",
      },
      {
        name: "flowise",
        displayName: "Flowise",
        url: this.configService.get("FLOWISE_URL") ?? "http://localhost:3001",
        description:
          "Visual AI workflow builder — drag-and-drop LangChain agents and LLM pipelines",
        icon: "Bot",
        color: "#3ecf8e",
      },
    ];
  }

  async checkAllTools(): Promise<ToolStatus[]> {
    return cacheWrap(
      "tools:status",
      async () => {
        return Promise.all(this.externalTools.map((tool) => this.checkToolHealth(tool)));
      },
      60,
    );
  }

  private async checkToolHealth(tool: ExternalTool): Promise<ToolStatus> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(tool.url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return {
        ...tool,
        status: response.ok ? "online" : "offline",
        responseTime: Date.now() - start,
      };
    } catch {
      return {
        ...tool,
        status: "offline",
        responseTime: Date.now() - start,
      };
    }
  }
}
