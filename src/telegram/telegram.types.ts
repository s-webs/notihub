export type TelegramSendInput = {
  token: string;
  chatId: string;
  threadId: number;
  text: string;
};

export type TelegramSendResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      retryable: boolean;
      retryAfterMs?: number;
    };

export type TelegramApiErrorBody = {
  ok: boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
};
