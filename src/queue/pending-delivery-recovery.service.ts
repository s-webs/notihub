import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { shouldRequeueStuckJob } from './pending-delivery.logic';
import {
  TELEGRAM_SEND_JOB,
  TELEGRAM_SEND_QUEUE,
  TelegramJobData,
} from './telegram-queue.constants';

const CHECK_MS = 30_000;
const STUCK_AFTER_MS = 60_000;

@Injectable()
export class PendingDeliveryRecoveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PendingDeliveryRecoveryService.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TELEGRAM_SEND_QUEUE)
    private readonly telegramQueue: Queue<TelegramJobData>,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.interval = setInterval(() => {
      void this.recover();
    }, CHECK_MS);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async recover(): Promise<number> {
    const stuck = await this.prisma.notificationLog.findMany({
      where: {
        status: NotificationStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
      },
      include: { routingRule: true },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    let recovered = 0;
    for (const log of stuck) {
      const existing = await this.telegramQueue.getJob(log.id);
      const state = existing ? await existing.getState() : undefined;
      if (!shouldRequeueStuckJob(state)) {
        continue;
      }

      if (existing) {
        await existing.remove();
      }

      await this.telegramQueue.add(
        TELEGRAM_SEND_JOB,
        {
          logId: log.id,
          botId: log.routingRule.botId,
          chatId: log.routingRule.chatId,
          threadId: log.routingRule.threadId,
          text: log.message ?? '',
        },
        { jobId: log.id },
      );
      recovered += 1;
    }

    if (recovered > 0) {
      this.logger.warn(`requeued ${recovered} stuck PENDING deliveries`);
    }

    return recovered;
  }
}
