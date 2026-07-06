import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { OllamaService } from "./ollama.service";

describe("OllamaService", () => {
  let service: OllamaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                OLLAMA_URL: "http://localhost:11434",
                OLLAMA_TIMEOUT_MS: "5000",
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
