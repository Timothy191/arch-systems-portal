import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AgentTriggerService } from "../../ai/agent-trigger.service";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly agentTriggerService: AgentTriggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.agentTriggerService.emitEvent({
        triggerType: "SERVER_CRASH",
        severity: "critical",
        context: {
          status,
          message:
            exception instanceof Error ? exception.message : "Unknown Error",
          url: request.url,
        },
      });
    }

    response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
