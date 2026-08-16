import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DelayedError, Job, UnrecoverableError } from 'bullmq';
import { NotificationStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { BotRateLimiterService } from './bot-rate-limiter.service';
import {
  TELEGRAM_SEND_QUEUE,
  TelegramJobData,
} from './telegram-queue.constants';

@Processor(TELEGRAM_SEND_QUEUE, {
  concurrency: 3,
  limiter: { max: 20, duration: 1000 },
})
export class TelegramProcessor extends WorkerHost {
  private readonly logger = new Logger(TelegramProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly rateLimiter: BotRateLimiterService,
  ) {
    super();
  }

  async process(job: Job<TelegramJobData>, token?: string): Promise<void> {
    const allowed = await this.rateLimiter.tryAcquire(job.data.botId);
    if (!allowed) {
      await this.delayJob(job, 1000, token);
    }

    const log = await this.prisma.notificationLog.findUnique({
      where: { id: job.data.logId },
    });
    if (log?.status === NotificationStatus.SENT) {
      return;
    }
    if (!log) {
      throw new UnrecoverableError(
        `Notification log ${job.data.logId} not found`,
      );
    }

    const bot = await this.prisma.bot.findUnique({
      where: { id: job.data.botId },
    });
    if (!bot || !bot.isActive) {
      await this.markFailed(job.data.logId, 'Bot is missing or inactive');
      throw new UnrecoverableError('Bot is missing or inactive');
    }

    const sent = await this.telegram.sendMessage({
      token: bot.telegramToken,
      chatId: job.data.chatId,
      threadId: job.data.threadId,
      text: job.data.text,
    });

    if (sent.ok) {
      await this.prisma.notificationLog.updateMany({
        where: { id: job.data.logId, status: { not: NotificationStatus.SENT } },
        data: {
          status: NotificationStatus.SENT,
          error: null,
          sentAt: new Date(),
        },
      });
      return;
    }

    this.logger.warn(
      `telegram send failed log=${job.data.logId} retryable=${String(sent.retryable)} error=${sent.error}`,
    );

    if (!sent.retryable) {
      await this.markFailed(job.data.logId, sent.error);
      throw new UnrecoverableError(sent.error);
    }

    if (sent.retryAfterMs) {
      await this.delayJob(job, sent.retryAfterMs, token);
    }

    throw new Error(sent.error);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TelegramJobData> | undefined, error: Error) {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts && !(error instanceof UnrecoverableError)) {
      return;
    }
    this.logger.warn(`job ${job.id} failed: ${error.message}`);
    await this.markFailed(job.data.logId, error.message);
  }

  private async delayJob(
    job: Job<TelegramJobData>,
    delayMs: number,
    token?: string,
  ): Promise<never> {
    if (!token) {
      throw new Error(`Cannot delay job ${job.id}: missing lock token`);
    }
    await job.moveToDelayed(Date.now() + delayMs, token);
    throw new DelayedError();
  }

  private async markFailed(logId: string, error: string) {
    await this.prisma.notificationLog.updateMany({
      where: { id: logId, status: { not: NotificationStatus.SENT } },
      data: { status: NotificationStatus.FAILED, error },
    });
  }
}
