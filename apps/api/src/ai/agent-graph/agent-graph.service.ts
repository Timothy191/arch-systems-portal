import { Injectable, Logger } from "@nestjs/common";
import { OllamaService, DEFAULT_MODEL, type OllamaMessage } from "../ollama/ollama.service";
import { systemPrompts } from "../prompts/prompt-registry.service";
import { MemoryService } from "../memory/memory.service";
import { ToolDispatchService } from "../tools/tool-dispatch.service";
import { CostTrackerService, type TokenUsage } from "../cost-tracker.service";
import { AiRateLimiterService } from "../rate-limiter.service";
import { type AgentState, type AgentNodeName, reduceState } from "./agent-state";

const MAX_LLM_RETRIES = 1;
const RETRY_BACKOFF_MIN_MS = 200;
const RETRY_BACKOFF_MAX_MS = 500;

@Injectable()
export class AgentGraphService {
  private readonly logger = new Logger(AgentGraphService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly memoryService: MemoryService,
    private readonly toolDispatchService: ToolDispatchService,
    private readonly costTrackerService: CostTrackerService,
    private readonly aiRateLimiterService: AiRateLimiterService,
  ) {}

  async runAgentGraph(initialState: AgentState): Promise<{ response: Response; finalState: AgentState }> {
    let state = { ...initialState };

    const nodeMap: Record<AgentNodeName, ((s: AgentState) => Promise<Partial<AgentState>>) | null> = {
      authenticate: (s) => this.authenticateNode(s),
      rateLimit: (s) => this.rateLimitNode(s),
      resolveContext: (s) => this.resolveContextNode(s),
      loadMemory: (s) => this.loadMemoryNode(s),
      gatherContext: (s) => this.gatherContextNode(s),
      callLLM: (s) => this.callLLMNode(s),
      executeTools: (s) => this.executeToolsNode(s),
      saveMemory: (s) => this.saveMemoryNode(s),
      output: (s) => this.outputNode(s),
      END: null,
    };

    while (state.shouldContinue && state.nextNode !== "END") {
      const node = nodeMap[state.nextNode];
      if (!node) break;

      try {
        const update = await node(state);
        state = reduceState(state, update);
      } catch (err) {
        this.logger.error(`Agent node ${state.nextNode} failed`, err);
        state = reduceState(state, {
          error: "Internal error in agent graph",
          statusCode: 500,
          shouldContinue: false,
          nextNode: "END",
        });
      }
    }

    if (state.error) {
      const response = new Response(JSON.stringify({ error: state.error }), {
        status: state.statusCode ?? 500,
        headers: { "Content-Type": "application/json" },
      });
      return { response, finalState: state };
    }

    if (!state.streamResponse) {
      const response = new Response(JSON.stringify({ error: "No response generated" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
      return { response, finalState: state };
    }

    return { response: state.streamResponse, finalState: state };
  }

  async finalizeAgentGraph(state: AgentState): Promise<void> {
    if (state.nextNode === "saveMemory" && !state.assistantResponseStored) {
      await this.saveMemoryNode(state);
    }
  }

  // ── Node implementations ──────────────────────────────────────

  private async authenticateNode(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.userId) {
      return { error: "Unauthorized", statusCode: 401, shouldContinue: false, nextNode: "END" };
    }
    return { nextNode: "rateLimit" };
  }

  private async rateLimitNode(state: AgentState): Promise<Partial<AgentState>> {
    const result = await this.aiRateLimiterService.check("chat", state.ip, 30, 60_000);
    if (!result.allowed) {
      return { error: "Rate limited", statusCode: 429, shouldContinue: false, nextNode: "END" };
    }
    return { nextNode: "resolveContext" };
  }

  private async resolveContextNode(state: AgentState): Promise<Partial<AgentState>> {
    // Context resolution is handled by the caller (controller) via the context field
    return { nextNode: "loadMemory" };
  }

  private async loadMemoryNode(state: AgentState): Promise<Partial<AgentState>> {
    const latestUserMessage = [...state.messages].reverse().find((m) => m.role === "user");
    if (!latestUserMessage) return { memoryContext: "", nextNode: "gatherContext" };

    const messageText = this.getMessageText(latestUserMessage);

    try {
      // Store user message
      await this.memoryService.storeMemory({
        sessionId: state.sessionId,
        userId: state.userId,
        content: `User: ${messageText}`,
        memoryType: "episodic",
        metadata: { message_id: latestUserMessage.id, role: "user", ip: state.ip },
      });

      // Retrieve relevant memories
      const [sessionMemories, semanticMemories] = await Promise.all([
        this.memoryService.retrieveRelevantMemories({
          userId: state.userId,
          query: messageText,
          sessionId: state.sessionId,
          memoryType: "episodic",
          limit: 10,
        }).catch(() => []),
        this.memoryService.retrieveRelevantMemories({
          userId: state.userId,
          query: messageText,
          memoryType: "semantic",
          limit: 5,
        }).catch(() => []),
      ]);

      const combined = [...sessionMemories, ...semanticMemories]
        .sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0))
        .slice(0, 10);

      const memoryContext = this.memoryService.formatMemoriesForContext(combined);
      return { memoryContext, userMessageStored: true, nextNode: "gatherContext" };
    } catch (err) {
      this.logger.warn("loadMemory node failed", err);
      return { memoryContext: "", nextNode: "gatherContext" };
    }
  }

  private async gatherContextNode(state: AgentState): Promise<Partial<AgentState>> {
    const latestUserMessage = [...state.messages].reverse().find((m) => m.role === "user");
    if (!latestUserMessage) return { nextNode: "callLLM" };

    const text = this.getMessageText(latestUserMessage);
    if (!text?.trim()) return { nextNode: "callLLM" };

    const dispatch = await this.toolDispatchService.dispatch(text);
    if (!dispatch) return { nextNode: "callLLM" };

    if (dispatch.confidence <= 2) {
      const clarificationMsg = `The user's intent is ambiguous (confidence: ${dispatch.confidence}/5, reason: "${dispatch.reason}"). Respond by asking a clarifying question.`;
      return {
        context: (state.context ?? "") + "\n\n" + clarificationMsg,
        nextNode: "callLLM",
      };
    }

    if (dispatch.tool === null) return { nextNode: "callLLM" };

    return {
      toolCalls: [{ tool: dispatch.tool, args: dispatch.args }],
      nextNode: "executeTools",
    };
  }

  private async executeToolsNode(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.toolCalls || state.toolCalls.length === 0) return { nextNode: "callLLM" };

    const results: unknown[] = [];
    let toolContext = "Operational Data Summary:\n";

    for (const call of state.toolCalls) {
      try {
        // Per-tool rate limit
        const allowed = await this.aiRateLimiterService.check("tool", state.ip, 60, 60_000, call.tool);
        if (!allowed.allowed) {
          results.push({ tool: call.tool, result: { error: `Rate limit exceeded for tool ${call.tool}` } });
          continue;
        }

        const result = await this.toolDispatchService.executeTool(state.userId, call.tool, call.args);
        results.push({ tool: call.tool, result });
        toolContext += `\n[Tool: ${call.tool}]\n${JSON.stringify(result, null, 2)}\n`;
      } catch (err) {
        this.logger.warn(`Tool execution failed: ${call.tool}`, err);
      }
    }

    return {
      toolResults: results,
      context: (state.context ?? "") + "\n\n" + toolContext,
      nextNode: "callLLM",
    };
  }

  private async callLLMNode(state: AgentState): Promise<Partial<AgentState>> {
    const contextStr = [state.context ?? "", state.memoryContext ?? ""].filter(Boolean).join("\n\n");
    const systemPrompt = systemPrompts.chat(contextStr || undefined);

    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      ...state.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: this.getMessageText(m),
        })),
    ];

    for (let retry = 0; retry <= MAX_LLM_RETRIES; retry++) {
      const temperature = retry > 0 ? 0 : 0.7;
      try {
        const streamGen = this.ollamaService.chatStream(messages, {
          model: state.selectedModel ?? DEFAULT_MODEL,
          temperature,
          maxTokens: 4096,
        });

        let fullText = "";
        let resolveText: (_value: string) => void;
        const textPromise = new Promise<string>((resolve) => { resolveText = resolve; });

        const iterator = streamGen[Symbol.asyncIterator]();
        const streamResponse = new Response(
          new ReadableStream({
            async pull(controller) {
              try {
                const { value, done } = await iterator.next();
                if (done) { resolveText!(fullText); controller.close(); return; }
                if (value) {
                  fullText += value;
                  controller.enqueue(new TextEncoder().encode(`0: ${value}\n`));
                }
              } catch (err) {
                resolveText!(fullText);
                controller.error(err instanceof Error ? err : new Error(String(err)));
              }
            },
            cancel() { resolveText!(fullText); },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );

        return {
          streamResponse,
          nextNode: "output",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        };
      } catch (error) {
        if (retry < MAX_LLM_RETRIES) {
          this.logger.warn(`LLM call retry ${retry + 1}`, error);
          await new Promise((r) => setTimeout(r, Math.random() * (RETRY_BACKOFF_MAX_MS - RETRY_BACKOFF_MIN_MS) + RETRY_BACKOFF_MIN_MS));
          continue;
        }
        this.logger.error("LLM call failed", error);
        return { error: "Failed to generate response", statusCode: 500, shouldContinue: false, nextNode: "END" };
      }
    }

    return { error: "Failed to generate response", statusCode: 500, shouldContinue: false, nextNode: "END" };
  }

  private async saveMemoryNode(state: AgentState): Promise<Partial<AgentState>> {
    if (state.assistantResponseStored) return { nextNode: "END" };

    try {
      if (state.usage) {
        await this.costTrackerService.trackUsage(
          state.sessionId,
          state.userId,
          state.provider,
          state.usage,
        );
      }
      return { assistantResponseStored: true, nextNode: "END" };
    } catch (err) {
      this.logger.warn("saveMemory node failed", err);
      return { nextNode: "END" };
    }
  }

  private async outputNode(state: AgentState): Promise<Partial<AgentState>> {
    if (!state.streamResponse) {
      return { error: "No LLM response available", statusCode: 500, shouldContinue: false, nextNode: "END" };
    }

    const response = new Response(state.streamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "x-arch-session-id": state.sessionId,
      },
    });

    return { streamResponse: response, shouldContinue: false, nextNode: "saveMemory" };
  }

  private getMessageText(msg: { content: string; parts?: Array<{ type: string; text?: string }> }): string {
    if (typeof msg.content === "string" && msg.content.length > 0) return msg.content;
    const textPart = msg.parts?.find((p) => p.type === "text");
    return textPart?.text ?? "";
  }
}
