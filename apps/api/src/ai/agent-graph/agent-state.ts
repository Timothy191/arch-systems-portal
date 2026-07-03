import type { TokenUsage } from "../cost-tracker.service";

export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

export interface AgentContext {
  departmentName?: string;
  departmentId?: string;
  userRole?: string;
}

export type AgentNodeName =
  | "authenticate"
  | "rateLimit"
  | "resolveContext"
  | "loadMemory"
  | "gatherContext"
  | "callLLM"
  | "executeTools"
  | "saveMemory"
  | "output"
  | "END";

export interface AgentState {
  userId: string;
  sessionId: string;
  ip: string;
  messages: UIMessage[];
  context?: string;
  agentContext: AgentContext;
  memoryContext: string;
  userMessageStored: boolean;
  assistantResponseStored: boolean;
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
  toolResults: unknown[];
  iterations: number;
  maxIterations: number;
  provider: "primary" | "secondary";
  usage?: TokenUsage;
  streamResponse?: Response;
  error?: string;
  statusCode?: number;
  shouldContinue: boolean;
  nextNode: AgentNodeName;
  selectedModel?: string;
}

export function createInitialAgentState(
  userId: string,
  sessionId: string,
  ip: string,
  messages: UIMessage[],
  context?: string,
  selectedModel?: string,
): AgentState {
  return {
    userId,
    sessionId,
    ip,
    messages,
    context,
    agentContext: {},
    memoryContext: "",
    userMessageStored: false,
    assistantResponseStored: false,
    toolCalls: [],
    toolResults: [],
    iterations: 0,
    maxIterations: 5,
    provider: "primary",
    shouldContinue: true,
    nextNode: "authenticate",
    selectedModel,
  };
}

export function reduceState(current: AgentState, update: Partial<AgentState>): AgentState {
  return { ...current, ...update };
}
