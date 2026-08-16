import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './basic-auth.guard';
import { ListLogsQueryDto } from './dto/list-logs.query';

@Controller('api/admin/logs')
@UseGuards(BasicAuthGuard)
export class LogsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list(@Query() query: ListLogsQueryDto) {
    return this.admin.listLogs(query);
  }
}
