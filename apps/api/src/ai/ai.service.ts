import { Injectable, Logger } from "@nestjs/common";
import { OllamaService } from "./ollama/ollama.service";
import { systemPrompts } from "./prompts/prompt-registry.service";
import {
  complianceResultSchema,
  riskAssessmentSchema,
  type ComplianceResult,
  type RiskAssessment,
} from "./schemas";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly ollamaService: OllamaService) {}

  async generateHandoff(shiftData: string): Promise<{ content: string }> {
    const content = await this.ollamaService.chat(
      [
        { role: "system", content: systemPrompts.shiftHandoff },
        {
          role: "user",
          content: `Generate a shift handoff report from this data:\n\n${shiftData}`,
        },
      ],
      { temperature: 0.5, maxTokens: 1024 },
    );

    return { content };
  }

  async predictMaintenance(machineData: string): Promise<RiskAssessment> {
    const raw = await this.ollamaService.chat(
      [
        { role: "system", content: systemPrompts.predictiveMaintenance },
        {
          role: "user",
          content: `Analyse this machine data and provide a risk assessment:\n\n${machineData}\nConsider hours worked, time since last maintenance, and recent issues when assessing risk level.\nReturn ONLY valid JSON — no extra text, no markdown fences.`,
        },
      ],
      { temperature: 0.3, maxTokens: 1024 },
    );

    return this.parseJsonWithFallback(raw, riskAssessmentSchema, {
      risk: "low",
      actions: [],
      timeEstimate: "unknown",
      summary: raw ?? "",
    });
  }

  async analyzeSafety(logData: string): Promise<ComplianceResult> {
    const raw = await this.ollamaService.chat(
      [
        { role: "system", content: systemPrompts.safetyCompliance },
        {
          role: "user",
          content: `Review these shift logs for safety compliance:\n\n${logData}\n\nReturn ONLY valid JSON, no extra text, no markdown fences.`,
        },
      ],
      { temperature: 0.3, maxTokens: 1024 },
    );

    return this.parseJsonWithFallback(raw, complianceResultSchema, {
      violations: [],
      concerns: [],
      score: 1,
      summary: raw ?? "",
    });
  }

  private parseJsonWithFallback<T>(
    raw: string,
    schema: {
      safeParse: (
        input: unknown,
      ) => { success: true; data: T } | { success: false };
    },
    fallback: T,
  ): T {
    try {
      const parsed = schema.safeParse(JSON.parse(raw ?? "{}"));
      return parsed.success ? parsed.data : fallback;
    } catch (error) {
      this.logger.warn("Failed to parse AI JSON response", error);
      return fallback;
    }
  }
}
