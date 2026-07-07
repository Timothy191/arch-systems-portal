import { Injectable, Logger } from "@nestjs/common";

export interface AiInvocationRecord {
  id: string;
  task: string;
  status: "success" | "failure" | "fallback" | "timeout" | "disabled" | "circuit_open";
  durationMs: number;
  attempt: number;
  gatewayStatus?: number;
  error?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AiInvocationTelemetry {
  private readonly logger = new Logger(AiInvocationTelemetry.name);
  private readonly records: AiInvocationRecord[] = [];
  private readonly maxRecords = 200;

  record(input: AiInvocationRecord): void {
    this.records.push(input);
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }

    this.logger.debug(
      `AI invocation telemetry: ${input.id} ${input.status} ${input.durationMs}ms attempt=${input.attempt}`,
    );
  }

  getRecent(limit = 20): AiInvocationRecord[] {
    return this.records.slice(-limit);
  }

  summarize(): Record<string, number> {
    return this.records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
