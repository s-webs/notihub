import {
  classifyTelegramFailure,
  classifyTransportFailure,
} from './telegram.errors';

describe('classifyTelegramFailure', () => {
  it('retries rate limits with retry_after', () => {
    const result = classifyTelegramFailure(429, {
      ok: false,
      error_code: 429,
      description: 'Too Many Requests: retry after 12',
      parameters: { retry_after: 12 },
    });
    expect(result.retryable).toBe(true);
    expect(result.retryAfterMs).toBe(12_000);
  });

  it('does not retry missing chats or threads', () => {
    expect(
      classifyTelegramFailure(400, {
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      }).retryable,
    ).toBe(false);

    expect(
      classifyTelegramFailure(400, {
        ok: false,
        error_code: 400,
        description: 'Bad Request: message thread not found',
      }).retryable,
    ).toBe(false);
  });

  it('does not retry blocked bots', () => {
    expect(
      classifyTelegramFailure(403, {
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      }).retryable,
    ).toBe(false);
  });

  it('retries transport failures', () => {
    expect(classifyTransportFailure(new Error('fetch failed')).retryable).toBe(
      true,
    );
  });
});
