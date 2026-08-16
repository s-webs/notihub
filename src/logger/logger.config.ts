import { IncomingMessage } from 'node:http';
import { Params } from 'nestjs-pino';

export function pinoLoggerParams(env: {
  NODE_ENV?: string;
  LOG_LEVEL?: string;
}): Params {
  const isProd = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test';

  return {
    pinoHttp: {
      level: isTest ? 'silent' : (env.LOG_LEVEL ?? (isProd ? 'info' : 'debug')),
      autoLogging: {
        ignore: (req: IncomingMessage) => {
          const url = req.url ?? '';
          return (
            url.startsWith('/health') ||
            url.startsWith('/docs') ||
            url.startsWith('/favicon')
          );
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-notihub-token"]',
          'req.headers["x-notihub-webhook-secret"]',
          'req.headers.cookie',
        ],
        remove: true,
      },
      transport:
        isProd || isTest
          ? undefined
          : {
              target: 'pino-pretty',
              options: { singleLine: true, colorize: true },
            },
    },
  };
}
