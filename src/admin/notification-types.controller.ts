import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './basic-auth.guard';
import {
  CreateNotificationTypeDto,
  UpdateNotificationTypeDto,
} from './dto/notification-type.dto';

@Controller('api/admin/clients/:clientId/notification-types')
@UseGuards(BasicAuthGuard)
export class NotificationTypesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list(@Param('clientId') clientId: string) {
    return this.admin.listNotificationTypes(clientId);
  }

  @Get(':id')
  get(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.admin.getNotificationType(clientId, id);
  }

  @Post()
  create(@Param('clientId') clientId: string, @Body() dto: CreateNotificationTypeDto) {
    return this.admin.createNotificationType(clientId, dto);
  }

  @Patch(':id')
  update(@Param('clientId') clientId: string, @Param('id') id: string, @Body() dto: UpdateNotificationTypeDto) {
    return this.admin.updateNotificationType(clientId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('clientId') clientId: string, @Param('id') id: string) {
    return this.admin.deleteNotificationType(clientId, id);
  }
}
