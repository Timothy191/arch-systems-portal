import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate user with email and password" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email" },
        password: { type: "string" },
      },
      required: ["email", "password"],
    },
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post("pin/hash")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hash a shift closeout PIN" })
  async hashPin(@Body() body: { pin: string }) {
    return this.authService.hashPin(body.pin);
  }

  @Post("pin/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a shift closeout PIN against a hash" })
  async verifyPin(@Body() body: { pin: string; hash: string }) {
    return this.authService.verifyPin(body.pin, body.hash);
  }
}
