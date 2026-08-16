import { TelegramApiErrorBody, TelegramSendResult } from './telegram.types';

const PERMANENT_PATTERNS = [
  'bot was blocked',
  'bot is not a member',
  'chat not found',
  'chat_id is empty',
  'group chat was deactivated',
  'have no rights',
  'kicked',
  'message thread not found',
  'thread not found',
  'unauthorized',
  'invalid token',
  'forbidden',
];

export function classifyTelegramFailure(
  httpStatus: number,
  body: TelegramApiErrorBody,
): Extract<TelegramSendResult, { ok: false }> {
  const description = body.description ?? `Telegram HTTP ${httpStatus}`;
  const errorCode = body.error_code ?? httpStatus;
  const retryAfterSec = body.parameters?.retry_after;
  const lowered = description.toLowerCase();

  if (errorCode === 429 || lowered.includes('too many requests')) {
    return {
      ok: false,
      error: description,
      retryable: true,
      retryAfterMs: (retryAfterSec ?? 1) * 1000,
    };
  }

  if (errorCode >= 500) {
    return { ok: false, error: description, retryable: true };
  }

  const permanent =
    errorCode === 401 ||
    errorCode === 403 ||
    errorCode === 400 ||
    errorCode === 404 ||
    PERMANENT_PATTERNS.some((pattern) => lowered.includes(pattern));

  return {
    ok: false,
    error: description,
    retryable: !permanent,
  };
}

export function classifyTransportFailure(
  error: unknown,
): Extract<TelegramSendResult, { ok: false }> {
  const message =
    error instanceof Error ? error.message : 'Unknown Telegram error';
  return { ok: false, error: message, retryable: true };
}
