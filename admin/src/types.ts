export type Client = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

export type Bot = {
  id: string;
  name: string;
  telegramTokenMasked: string;
  isActive: boolean;
};

export type NotificationType = {
  id: string;
  code: string;
  name: string;
};

export type RoutingRule = {
  id: string;
  clientId: string;
  botId: string;
  notificationTypeId: string;
  chatId: string;
  threadId: number;
  isActive: boolean;
  client: Pick<Client, 'id' | 'slug' | 'name'>;
  bot: Pick<Bot, 'id' | 'name' | 'isActive'>;
  notificationType: NotificationType;
};

export type LogItem = {
  id: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error: string | null;
  request: {
    client?: string;
    type?: string;
    payload?: Record<string, unknown>;
    idempotency_key?: string;
  } | null;
  message: string | null;
  sentAt: string | null;
  createdAt: string;
  routingRule: {
    chatId: string;
    threadId: number;
    client: { slug: string; name: string };
    bot: { name: string };
    notificationType: { code: string; name: string };
  };
};
