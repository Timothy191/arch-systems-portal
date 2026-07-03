import { Global, Module } from "@nestjs/common";
import { REDIS_CLIENT } from "./redis.constants";
import { getRedisClient, closeRedis } from "@repo/redis";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async () => getRedisClient(),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
