import { Injectable, Logger } from '@nestjs/common';
import {
  classifyTelegramFailure,
  classifyTransportFailure,
} from './telegram.errors';
import {
  TelegramApiErrorBody,
  TelegramSendInput,
  TelegramSendResult,
} from './telegram.types';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  async sendMessage(input: TelegramSendInput): Promise<TelegramSendResult> {
    const url = `https://api.telegram.org/bot${input.token}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: input.chatId,
      text: input.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    if (input.threadId > 0) {
      body.message_thread_id = input.threadId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      const data = (await response.json()) as TelegramApiErrorBody;
      if (!response.ok || !data.ok) {
        const failure = classifyTelegramFailure(response.status, data);
        this.logger.warn(failure.error);
        return failure;
      }

      return { ok: true };
    } catch (error) {
      const failure = classifyTransportFailure(error);
      this.logger.error(failure.error);
      return failure;
    }
  }
}
