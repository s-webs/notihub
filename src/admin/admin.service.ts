import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
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
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { ListLogsQueryDto } from './dto/list-logs.query';
import {
  CreateNotificationTypeDto,
  UpdateNotificationTypeDto,
} from './dto/notification-type.dto';
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
} from './dto/routing-rule.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TELEGRAM_SEND_QUEUE)
    private readonly telegramQueue: Queue<TelegramJobData>,
  ) {}

  listClients() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
  }

  getClient(id: string) {
    return this.ensureClient(id);
  }

  async createClient(dto: CreateClientDto) {
    try {
      return await this.prisma.client.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      uniqueOrThrow(error, 'Client slug already exists');
    }
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    await this.ensureClient(id);
    try {
      return await this.prisma.client.update({ where: { id }, data: dto });
    } catch (error) {
      uniqueOrThrow(error, 'Client slug already exists');
    }
  }

  async deleteClient(id: string) {
    await this.ensureClient(id);
    try {
      await this.prisma.client.delete({ where: { id } });
    } catch (error) {
      inUseOrThrow(error, 'Client is used by routing rules');
    }
  }

  async listBots() {
    const bots = await this.prisma.bot.findMany({ orderBy: { name: 'asc' } });
    return bots.map(publicBot);
  }

  async createBot(dto: CreateBotDto) {
    try {
      const bot = await this.prisma.bot.create({
        data: {
          name: dto.name,
          telegramToken: dto.telegramToken,
          isActive: dto.isActive ?? true,
        },
      });
      return publicBot(bot);
    } catch (error) {
      uniqueOrThrow(error, 'Bot token already exists');
    }
  }

  async updateBot(id: string, dto: UpdateBotDto) {
    await this.ensureBot(id);
    try {
      const bot = await this.prisma.bot.update({
        where: { id },
        data: {
          name: dto.name,
          isActive: dto.isActive,
          ...(dto.telegramToken ? { telegramToken: dto.telegramToken } : {}),
        },
      });
      return publicBot(bot);
    } catch (error) {
      uniqueOrThrow(error, 'Bot token already exists');
    }
  }

  async deleteBot(id: string) {
    await this.ensureBot(id);
    try {
      await this.prisma.bot.delete({ where: { id } });
    } catch (error) {
      inUseOrThrow(error, 'Bot is used by routing rules');
    }
  }

  async listNotificationTypes(clientId: string) {
    await this.ensureClient(clientId);
    return this.prisma.notificationType.findMany({
      where: { clientId },
      orderBy: { code: 'asc' },
    });
  }

  getNotificationType(clientId: string, id: string) {
    return this.ensureType(id, clientId);
  }

  async createNotificationType(clientId: string, dto: CreateNotificationTypeDto) {
    await this.ensureClient(clientId);
    try {
      return await this.prisma.notificationType.create({
        data: { ...dto, clientId },
      });
    } catch (error) {
      uniqueOrThrow(error, 'Notification type code already exists');
    }
  }

  async updateNotificationType(clientId: string, id: string, dto: UpdateNotificationTypeDto) {
    await this.ensureType(id, clientId);
    try {
      return await this.prisma.notificationType.update({
        where: { clientId_id: { clientId, id } },
        data: dto,
      });
    } catch (error) {
      uniqueOrThrow(error, 'Notification type code already exists');
    }
  }

  async deleteNotificationType(clientId: string, id: string) {
    await this.ensureType(id, clientId);
    try {
      await this.prisma.notificationType.delete({
        where: { clientId_id: { clientId, id } },
      });
    } catch (error) {
      inUseOrThrow(error, 'Notification type is used by routing rules');
    }
  }

  listRoutingRules(clientId?: string) {
    return this.prisma.routingRule.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, slug: true, name: true } },
        bot: { select: { id: true, name: true, isActive: true } },
        notificationType: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async createRoutingRule(dto: CreateRoutingRuleDto) {
    await Promise.all([
      this.ensureClient(dto.clientId),
      this.ensureBot(dto.botId),
      this.ensureType(dto.notificationTypeId, dto.clientId),
    ]);
    try {
      return await this.prisma.routingRule.create({
        data: {
          clientId: dto.clientId,
          botId: dto.botId,
          notificationTypeId: dto.notificationTypeId,
          chatId: dto.chatId,
          threadId: dto.threadId ?? 0,
          isActive: dto.isActive ?? true,
        },
        include: {
          client: { select: { id: true, slug: true, name: true } },
          bot: { select: { id: true, name: true, isActive: true } },
          notificationType: { select: { id: true, code: true, name: true } },
        },
      });
    } catch (error) {
      uniqueOrThrow(error, 'Routing rule already exists');
    }
  }

  async updateRoutingRule(id: string, dto: UpdateRoutingRuleDto) {
    const rule = await this.ensureRule(id);
    const clientId = dto.clientId ?? rule.clientId;
    const typeId = dto.notificationTypeId ?? rule.notificationTypeId;
    await Promise.all([
      dto.clientId ? this.ensureClient(dto.clientId) : Promise.resolve(),
      dto.botId ? this.ensureBot(dto.botId) : Promise.resolve(),
      this.ensureType(typeId, clientId),
    ]);
    try {
      return await this.prisma.routingRule.update({
        where: { id },
        data: dto,
        include: {
          client: { select: { id: true, slug: true, name: true } },
          bot: { select: { id: true, name: true, isActive: true } },
          notificationType: { select: { id: true, code: true, name: true } },
        },
      });
    } catch (error) {
      uniqueOrThrow(error, 'Routing rule already exists');
    }
  }

  async deleteRoutingRule(id: string) {
    await this.ensureRule(id);
    await this.prisma.routingRule.delete({ where: { id } });
  }

  async listLogs(query: ListLogsQueryDto) {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;
    const where: Prisma.NotificationLogWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.clientId || query.botId) {
      where.routingRule = {
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.botId ? { botId: query.botId } : {}),
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notificationLog.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          routingRule: {
            include: {
              client: { select: { slug: true, name: true } },
              bot: { select: { name: true } },
              notificationType: { select: { code: true, name: true } },
            },
          },
        },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { total, take, skip, items };
  }

  async retryLog(id: string) {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id },
      include: { routingRule: true },
    });
    if (!log) {
      throw new NotFoundException('Log not found');
    }
    if (log.status !== NotificationStatus.FAILED) {
      throw new ConflictException('Only FAILED deliveries can be retried');
    }

    const existing = await this.telegramQueue.getJob(log.id);
    if (existing) {
      await existing.remove();
    }

    const updated = await this.prisma.notificationLog.updateMany({
      where: { id: log.id, status: NotificationStatus.FAILED },
      data: { status: NotificationStatus.PENDING, error: null },
    });
    if (updated.count === 0) {
      throw new ConflictException('Delivery is already being retried');
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

    return { id: log.id, status: NotificationStatus.PENDING };
  }

  private async ensureClient(id: string) {
    const row = await this.prisma.client.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Client not found');
    }
    return row;
  }

  private async ensureBot(id: string) {
    const row = await this.prisma.bot.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Bot not found');
    }
  }

  private async ensureType(id: string, clientId?: string) {
    const row = await this.prisma.notificationType.findUnique({
      where: clientId ? { clientId_id: { clientId, id } } : { id },
    });
    if (!row) {
      throw new NotFoundException('Notification type not found');
    }
    return row;
  }

  private async ensureRule(id: string) {
    const row = await this.prisma.routingRule.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Routing rule not found');
    }
    return row;
  }
}

function publicBot(bot: {
  id: string;
  name: string;
  telegramToken: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: bot.id,
    name: bot.name,
    telegramTokenMasked: maskSecret(bot.telegramToken),
    isActive: bot.isActive,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  };
}

function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '••••';
  }
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function uniqueOrThrow(error: unknown, message: string): never {
  if (isPrismaCode(error, 'P2002')) {
    throw new ConflictException(message);
  }
  throw error instanceof Error ? error : new Error('Unexpected database error');
}

function inUseOrThrow(error: unknown, message: string): never {
  if (isPrismaCode(error, 'P2003') || isPrismaCode(error, 'P2014')) {
    throw new ConflictException(message);
  }
  throw error instanceof Error ? error : new Error('Unexpected database error');
}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === code
  );
}
