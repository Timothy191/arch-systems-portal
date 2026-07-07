import { Test, TestingModule } from "@nestjs/testing";
import { AiController } from "./ai.controller";
import { AgentTriggerService } from "./agent-trigger.service";

describe("AiController", () => {
  let controller: AiController;
  let agentTriggerService: jest.Mocked<AgentTriggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AgentTriggerService,
          useValue: {
            emitEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    agentTriggerService = module.get(
      AgentTriggerService,
    ) as jest.Mocked<AgentTriggerService>;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should emit event and return success", async () => {
    const payload = { action: "generate_report", department: "ops" };
    const result = await controller.manualTrigger(payload);

    expect(agentTriggerService.emitEvent).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });

  it("should handle empty payload", async () => {
    const result = await controller.manualTrigger({});

    expect(agentTriggerService.emitEvent).toHaveBeenCalledWith({});
    expect(result).toEqual({ success: true });
  });
});
