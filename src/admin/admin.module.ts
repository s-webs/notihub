import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './basic-auth.guard';
import { BotsController } from './bots.controller';
import { ClientsController } from './clients.controller';
import { LogsController } from './logs.controller';
import { NotificationTypesController } from './notification-types.controller';
import { RoutingRulesController } from './routing-rules.controller';

@Module({
  controllers: [
    ClientsController,
    BotsController,
    NotificationTypesController,
    RoutingRulesController,
    LogsController,
  ],
  providers: [AdminService, BasicAuthGuard],
})
export class AdminModule {}
