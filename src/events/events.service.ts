import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma } from '../generated/prisma/client';
import { NotificationStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  TELEGRAM_SEND_JOB,
  TELEGRAM_SEND_QUEUE,
  TelegramJobData,
} from '../queue/telegram-queue.constants';
import { CreateEventDto } from './dto/create-event.dto';
import { EventHandleResult } from './events.types';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TELEGRAM_SEND_QUEUE)
    private readonly telegramQueue: Queue<TelegramJobData>,
  ) {}

  async handle(dto: CreateEventDto): Promise<EventHandleResult> {
    const client = await this.prisma.client.findUnique({
      where: { slug: dto.client },
    });
    if (!client) {
      throw new NotFoundException(`Unknown client: ${dto.client}`);
    }
    if (!client.isActive) {
      throw new BadRequestException(`Client is inactive: ${dto.client}`);
    }

    if (dto.idempotency_key) {
      const replay = await this.findIdempotent(client.id, dto.idempotency_key);
      if (replay) {
        return replay;
      }
    }

    const notificationType = await this.prisma.notificationType.findUnique({
      where: { code: dto.type },
    });
    if (!notificationType) {
      throw new NotFoundException(`Unknown notification type: ${dto.type}`);
    }

    const rules = await this.prisma.routingRule.findMany({
      where: {
        clientId: client.id,
        notificationTypeId: notificationType.id,
        isActive: true,
        bot: { isActive: true },
      },
    });

    const text = formatEventMessage(dto.client, dto.type, dto.payload);
    const deliveries: EventHandleResult['deliveries'] = [];

    for (const rule of rules) {
      const log = await this.prisma.notificationLog.create({
        data: {
          routingRuleId: rule.id,
          status: NotificationStatus.PENDING,
          request: {
            client: dto.client,
            type: dto.type,
            payload: dto.payload,
            ...(dto.idempotency_key
              ? { idempotency_key: dto.idempotency_key }
              : {}),
          } as Prisma.InputJsonValue,
          message: text,
        },
      });

      await this.telegramQueue.add(
        TELEGRAM_SEND_JOB,
        {
          logId: log.id,
          botId: rule.botId,
          chatId: rule.chatId,
          threadId: rule.threadId,
          text,
        },
        { jobId: log.id },
      );

      deliveries.push({
        routingRuleId: rule.id,
        logId: log.id,
        status: NotificationStatus.PENDING,
        error: null,
      });
    }

    const result: EventHandleResult = {
      matched: rules.length,
      queued: true,
      deliveries,
    };

    if (dto.idempotency_key) {
      try {
        await this.prisma.eventIdempotency.create({
          data: {
            clientId: client.id,
            key: dto.idempotency_key,
            response: result,
          },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const replay = await this.findIdempotent(
            client.id,
            dto.idempotency_key,
          );
          if (replay) {
            return replay;
          }
        }
        throw error;
      }
    }

    this.logger.log(
      `event client=${dto.client} type=${dto.type} matched=${rules.length} queued=${deliveries.length}`,
    );

    return result;
  }

  private async findIdempotent(
    clientId: string,
    key: string,
  ): Promise<EventHandleResult | null> {
    const existing = await this.prisma.eventIdempotency.findUnique({
      where: { clientId_key: { clientId, key } },
    });
    if (!existing) {
      return null;
    }
    return {
      ...(existing.response as EventHandleResult),
      idempotent: true,
    };
  }
}

export function formatEventMessage(
  client: string,
  type: string,
  payload: Record<string, unknown>,
): string {
  const direct = payload.message ?? payload.text;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct;
  }

  const lines = Object.entries(payload).map(([key, value]) => {
    const rendered =
      value !== null && typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
    return `${escapeHtml(key)}: ${escapeHtml(rendered)}`;
  });

  return [`[${escapeHtml(client)}] ${escapeHtml(type)}`, '', ...lines].join(
    '\n',
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}
