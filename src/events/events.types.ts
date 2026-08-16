import { NotificationStatus } from '../generated/prisma/enums';

export type EventDeliveryResult = {
  routingRuleId: string;
  logId: string;
  status: NotificationStatus;
  error: string | null;
};

export type EventHandleResult = {
  matched: number;
  queued: boolean;
  deliveries: EventDeliveryResult[];
  idempotent?: boolean;
};
