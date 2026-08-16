import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EventsModule } from '../events/events.module';
import { HealthModule } from '../health/health.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

export function setupOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Notification Hub')
    .setDescription(
      [
        'Универсальный приём событий и маршрутизация в Telegram.',
        '',
        'Интеграция без SDK: `POST /events` с JSON `{ client, type, payload, idempotency_key? }`.',
        'Если задан `EVENTS_API_TOKEN`, передайте его как Bearer или заголовок `X-Notihub-Token`.',
        '',
        'Сторонние системы с чужим форматом payload подключаются webhook-адаптером (`/webhooks/*`).',
        'Если в `payload` есть `message` или `text`, оно уходит в Telegram как HTML.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'API token' },
      'events-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Notihub-Webhook-Secret',
        description: 'Секрет webhook (`GLITCHTIP_WEBHOOK_SECRET`)',
      },
      'webhook-secret',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [EventsModule, WebhooksModule, HealthModule],
  });
  SwaggerModule.setup('docs', app, document);
}
