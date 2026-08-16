import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from '../generated/prisma/enums';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  formatFailureSpikeAlert,
  formatReadyAlert,
  formatRecoveredAlert,
  readyTransition,
} from './monitor.logic';

const CHECK_MS = 60_000;
const START_DELAY_MS = 15_000;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class HubMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HubMonitorService.name);
  private startTimer: NodeJS.Timeout | undefined;
  private interval: NodeJS.Timeout | undefined;
  private depsDown = false;
  private failureAlerted = false;

  constructor(
    private readonly config: ConfigService,
    private readonly health: HealthService,
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('NODE_ENV') === 'test') {
      return;
    }
    this.startTimer = setTimeout(() => {
      void this.tick();
      this.interval = setInterval(() => {
        void this.tick();
      }, CHECK_MS);
    }, START_DELAY_MS);
  }

  onModuleDestroy() {
    if (this.startTimer) {
      clearTimeout(this.startTimer);
    }
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async tick() {
    await this.checkDependencies();
    await this.checkFailedDeliveries();
  }

  private async checkDependencies() {
    const snapshot = await this.health.probe();
    const transition = readyTransition(this.depsDown, snapshot);
    this.depsDown = snapshot.status !== 'ok';

    if (transition === 'down') {
      this.logger.error(
        `hub dependencies down postgres=${String(snapshot.postgres)} redis=${String(snapshot.redis)}`,
      );
      await this.alert(formatReadyAlert(snapshot));
    } else if (transition === 'recovered') {
      this.logger.log('hub dependencies recovered');
      await this.alert(formatRecoveredAlert());
    }
  }

  private async checkFailedDeliveries() {
    const threshold = this.config.get<number>('HUB_ALERT_FAIL_THRESHOLD', 10);
    const since = new Date(Date.now() - FAIL_WINDOW_MS);
    let count = 0;
    try {
      count = await this.prisma.notificationLog.count({
        where: {
          status: NotificationStatus.FAILED,
          createdAt: { gte: since },
        },
      });
    } catch (error) {
      this.logger.warn(
        `failed-delivery count skipped: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return;
    }

    if (count >= threshold && !this.failureAlerted) {
      this.failureAlerted = true;
      this.logger.error(
        `failed delivery spike count=${count} threshold=${threshold}`,
      );
      await this.alert(formatFailureSpikeAlert(count, 15));
      return;
    }
    if (count < threshold) {
      this.failureAlerted = false;
    }
  }

  private async alert(text: string) {
    const token = this.config.get<string>('HUB_ALERT_BOT_TOKEN');
    const chatId = this.config.get<string>('HUB_ALERT_CHAT_ID');
    if (!token || !chatId) {
      this.logger.warn(
        'hub alert skipped: HUB_ALERT_BOT_TOKEN/CHAT_ID not set',
      );
      return;
    }

    const threadId = this.config.get<number>('HUB_ALERT_THREAD_ID', 0);
    const sent = await this.telegram.sendMessage({
      token,
      chatId,
      threadId,
      text,
    });
    if (!sent.ok) {
      this.logger.error(`hub alert telegram failed: ${sent.error}`);
    }
  }
}
