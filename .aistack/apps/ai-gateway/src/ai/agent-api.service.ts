import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AgentApiService {
  private readonly logger = new Logger(AgentApiService.name);
  private readonly aiAgentsUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.aiAgentsUrl = this.configService.get("AI_AGENTS_API_URL") || "http://localhost:8001";
  }

  /**
   * Proxies a request to the LangGraph/CrewAI Python microservice 
   * to perform complex multi-agent workflows.
   */
  async invokeCrewAiWorkflow(taskDescription: string, context: any) {
    this.logger.debug(`Invoking CrewAI workflow on ${this.aiAgentsUrl}`);
    try {
      // In a real implementation this would fetch from the Python AI microservice
      // const response = await fetch(`${this.aiAgentsUrl}/api/v1/crew/invoke`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ task: taskDescription, context })
      // });
      // return await response.json();
      
      // Mocked successful return mapping:
      return {
        status: "success",
        workflow: "crew_triaging",
        result: `Completed complex workflow for: ${taskDescription}`
      };
    } catch (error) {
      this.logger.error("Failed to invoke Python AI Agents service", error);
      throw new Error("AI Agent workflow failed");
    }
  }

  async invokeLangGraphWorkflow(state: any) {
    this.logger.debug(`Invoking LangGraph stateful workflow on ${this.aiAgentsUrl}`);
    try {
      // Mocked successful return mapping:
      return {
        status: "success",
        workflow: "langgraph_stateful",
        finalState: { ...state, agent_processed: true }
      };
    } catch (error) {
      this.logger.error("Failed to invoke LangGraph service", error);
      throw new Error("LangGraph workflow failed");
    }
  }
}
