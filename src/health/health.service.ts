import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type ReadyStatus = {
  status: 'ok' | 'error';
  postgres: boolean;
  redis: boolean;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  live() {
    return { status: 'ok' as const };
  }

  async probe(): Promise<ReadyStatus> {
    const postgres = await this.pingPostgres();
    const redis = await this.pingRedis();
    return {
      status: postgres && redis ? 'ok' : 'error',
      postgres,
      redis,
    };
  }

  async ready(): Promise<ReadyStatus> {
    const result = await this.probe();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  private async pingPostgres(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
