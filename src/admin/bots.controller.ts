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
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';

@Controller('api/admin/bots')
@UseGuards(BasicAuthGuard)
export class BotsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  list() {
    return this.admin.listBots();
  }

  @Post()
  create(@Body() dto: CreateBotDto) {
    return this.admin.createBot(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBotDto) {
    return this.admin.updateBot(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.admin.deleteBot(id);
  }
}
