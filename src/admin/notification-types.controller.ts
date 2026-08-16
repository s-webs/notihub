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

@Controller('api/admin/notification-types')
@UseGuards(BasicAuthGuard)
export class NotificationTypesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listNotificationTypes();
  }

  @Post()
  create(@Body() dto: CreateNotificationTypeDto) {
    return this.admin.createNotificationType(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotificationTypeDto) {
    return this.admin.updateNotificationType(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.admin.deleteNotificationType(id);
  }
}
