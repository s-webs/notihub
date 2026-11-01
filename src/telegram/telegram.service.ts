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

  async sendDocument(
    input: TelegramSendInput & { documentUrl: string; filename: string },
  ): Promise<TelegramSendResult> {
    let documentUrl: URL;
    try {
      documentUrl = new URL(input.documentUrl);
    } catch {
      return { ok: false, error: 'Invalid document URL', retryable: false };
    }
    const allowedOrigins = (process.env.DOCUMENT_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (!allowedOrigins.includes(documentUrl.origin)) {
      return {
        ok: false,
        error: 'Document origin is not allowed',
        retryable: false,
      };
    }
    if (input.text.length > 1024) {
      return {
        ok: false,
        error: 'Document caption is too long',
        retryable: false,
      };
    }

    try {
      const download = await fetch(documentUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (!download.ok) {
        return {
          ok: false,
          error: `Document download HTTP ${download.status}`,
          retryable: download.status === 429 || download.status >= 500,
        };
      }
      const maxBytes = 25 * 1024 * 1024;
      if (Number(download.headers.get('content-length') ?? 0) > maxBytes) {
        return { ok: false, error: 'Document exceeds 25 MB', retryable: false };
      }
      const bytes = Buffer.from(await download.arrayBuffer());
      if (
        bytes.length > maxBytes ||
        bytes.subarray(0, 5).toString() !== '%PDF-'
      ) {
        return {
          ok: false,
          error: 'Document is not a valid PDF under 25 MB',
          retryable: false,
        };
      }
      const body = new FormData();
      body.append('chat_id', input.chatId);
      body.append('caption', input.text);
      body.append('parse_mode', 'HTML');
      if (input.threadId > 0) {
        body.append('message_thread_id', String(input.threadId));
      }
      const filename =
        input.filename.replace(/[\\/]/g, '_').slice(0, 200) || 'receipt.pdf';
      body.append(
        'document',
        new Blob([bytes], { type: 'application/pdf' }),
        filename,
      );
      const response = await fetch(
        `https://api.telegram.org/bot${input.token}/sendDocument`,
        { method: 'POST', body, signal: AbortSignal.timeout(30_000) },
      );
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
