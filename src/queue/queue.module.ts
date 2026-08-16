import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redisConnectionFromUrl } from '../redis/redis.connection';
import { TelegramModule } from '../telegram/telegram.module';
import { BotRateLimiterService } from './bot-rate-limiter.service';
import { TELEGRAM_SEND_QUEUE } from './telegram-queue.constants';
import { PendingDeliveryRecoveryService } from './pending-delivery-recovery.service';
import { TelegramProcessor } from './telegram.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(
          config.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    BullModule.registerQueue({
      name: TELEGRAM_SEND_QUEUE,
      defaultJobOptions: {
        attempts: 8,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: TELEGRAM_SEND_QUEUE,
      adapter: BullMQAdapter,
    }),
    TelegramModule,
  ],
  providers: [
    TelegramProcessor,
    BotRateLimiterService,
    PendingDeliveryRecoveryService,
  ],
  exports: [BullModule],
})
export class QueueModule {}
