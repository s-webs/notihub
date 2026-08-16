import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { GlitchTipController } from './glitchtip.controller';
import { WebhookSecretGuard } from './webhook-secret.guard';

// Новые адаптеры (Grafana, Uptime Kuma, Sentry, GitHub Actions) — отдельный
// контроллер в этом модуле. Универсальный вход без адаптера: POST /events.

@Module({
  imports: [EventsModule],
  controllers: [GlitchTipController],
  providers: [WebhookSecretGuard],
})
export class WebhooksModule {}
