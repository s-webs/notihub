import { pinoLoggerParams } from './logger.config';

describe('pinoLoggerParams', () => {
  it('uses silent logs in test', () => {
    const params = pinoLoggerParams({ NODE_ENV: 'test', LOG_LEVEL: 'debug' });
    expect(params.pinoHttp).toMatchObject({ level: 'silent' });
  });

  it('uses JSON (no pretty transport) in production', () => {
    const params = pinoLoggerParams({ NODE_ENV: 'production' });
    expect(params.pinoHttp).toMatchObject({ level: 'info' });
    expect(
      (params.pinoHttp as { transport?: unknown }).transport,
    ).toBeUndefined();
  });

  it('ignores health checks', () => {
    const params = pinoLoggerParams({ NODE_ENV: 'production' });
    const ignore = (
      params.pinoHttp as {
        autoLogging: { ignore: (req: { url?: string }) => boolean };
      }
    ).autoLogging.ignore;
    expect(ignore({ url: '/health/ready' })).toBe(true);
    expect(ignore({ url: '/events' })).toBe(false);
  });
});
