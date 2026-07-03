import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: "SUPABASE_CLIENT",
          useValue: {
            auth: {
              signInWithPassword: jest.fn().mockResolvedValue({
                data: { user: { id: "user-1", email: "test@test.com" }, session: { access_token: "token-123" } },
                error: null,
              }),
              getUser: jest.fn().mockResolvedValue({
                data: { user: { id: "user-1" } },
                error: null,
              }),
            },
            from: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: "emp-1", role: "admin" },
                    error: null,
                  }),
                }),
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
