import { mapGlitchTipPayload } from './glitchtip.mapper';

describe('mapGlitchTipPayload', () => {
  it('maps a GlitchTip issue webhook', () => {
    const mapped = mapGlitchTipPayload('almaty-foods', {
      action: 'created',
      data: {
        issue: {
          id: 42,
          title: 'Undefined variable $foo',
          culprit: 'app/Http/Controllers/SaleController.php in store',
          permalink: 'https://glitchtip.example/issues/42',
          level: 'error',
        },
      },
      project_name: 'backend',
    });

    expect(mapped).toMatchObject({
      client: 'almaty-foods',
      type: 'app_error',
      idempotency_key: 'glitchtip:almaty-foods:42',
      payload: {
        title: 'Undefined variable $foo',
        culprit: 'app/Http/Controllers/SaleController.php in store',
        url: 'https://glitchtip.example/issues/42',
        level: 'error',
        project: 'backend',
        source: 'glitchtip',
      },
    });
    expect(mapped.payload.message).toContain('Ошибка приложения');
    expect(mapped.payload.message).toContain('Undefined variable $foo');
  });

  it('maps a classic Sentry-style payload', () => {
    const mapped = mapGlitchTipPayload('s-webs', {
      id: 'abc',
      project: 'web',
      message: 'boom',
      culprit: 'index.ts',
      url: 'https://glitchtip.example/issues/abc',
      level: 'fatal',
    });

    expect(mapped.idempotency_key).toBe('glitchtip:s-webs:abc');
    expect(mapped.payload.title).toBe('boom');
    expect(mapped.payload.project).toBe('web');
  });

  it('falls back when the body is empty', () => {
    const mapped = mapGlitchTipPayload('s-webs', null);

    expect(mapped.type).toBe('app_error');
    expect(mapped.payload.title).toBe('Application error');
    expect(mapped.idempotency_key).toBeUndefined();
  });
});
