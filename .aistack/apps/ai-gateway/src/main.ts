import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Basic CORS for bridging
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  Logger.log(`AI Gateway successfully started on port ${port}`, "Bootstrap");
}
bootstrap();
