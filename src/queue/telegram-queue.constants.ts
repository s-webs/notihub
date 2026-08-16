export const TELEGRAM_SEND_QUEUE = 'telegram-send';

export const TELEGRAM_SEND_JOB = 'send';

export type TelegramJobData = {
  logId: string;
  botId: string;
  chatId: string;
  threadId: number;
  text: string;
};
