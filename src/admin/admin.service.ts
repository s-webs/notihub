import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  listClients() {
    return this.prisma.client.findMany({ orderBy: { name: 'asc' } });
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

  listNotificationTypes() {
    return this.prisma.notificationType.findMany({ orderBy: { code: 'asc' } });
  }

  async createNotificationType(dto: CreateNotificationTypeDto) {
    try {
      return await this.prisma.notificationType.create({ data: dto });
    } catch (error) {
      uniqueOrThrow(error, 'Notification type code already exists');
    }
  }

  async updateNotificationType(id: string, dto: UpdateNotificationTypeDto) {
    await this.ensureType(id);
    try {
      return await this.prisma.notificationType.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      uniqueOrThrow(error, 'Notification type code already exists');
    }
  }

  async deleteNotificationType(id: string) {
    await this.ensureType(id);
    try {
      await this.prisma.notificationType.delete({ where: { id } });
    } catch (error) {
      inUseOrThrow(error, 'Notification type is used by routing rules');
    }
  }

  listRoutingRules() {
    return this.prisma.routingRule.findMany({
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
      this.ensureType(dto.notificationTypeId),
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
    await this.ensureRule(id);
    await Promise.all([
      dto.clientId ? this.ensureClient(dto.clientId) : Promise.resolve(),
      dto.botId ? this.ensureBot(dto.botId) : Promise.resolve(),
      dto.notificationTypeId
        ? this.ensureType(dto.notificationTypeId)
        : Promise.resolve(),
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

  private async ensureClient(id: string) {
    const row = await this.prisma.client.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Client not found');
    }
  }

  private async ensureBot(id: string) {
    const row = await this.prisma.bot.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Bot not found');
    }
  }

  private async ensureType(id: string) {
    const row = await this.prisma.notificationType.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Notification type not found');
    }
  }

  private async ensureRule(id: string) {
    const row = await this.prisma.routingRule.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Routing rule not found');
    }
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
