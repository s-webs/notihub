import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BotRateLimiterService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async tryAcquire(botId: string): Promise<boolean> {
    const max = this.config.get<number>('TELEGRAM_RATE_LIMIT_PER_SEC', 20);
    const bucket = Math.floor(Date.now() / 1000);
    const key = `notihub:ratelimit:bot:${botId}:${bucket}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, 2);
    }
    return count <= max;
  }
}
