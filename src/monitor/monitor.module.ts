import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { TelegramModule } from '../telegram/telegram.module';
import { HubMonitorService } from './hub-monitor.service';

@Module({
  imports: [HealthModule, TelegramModule],
  providers: [HubMonitorService],
})
export class MonitorModule {}
