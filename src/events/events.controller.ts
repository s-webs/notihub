import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-event.dto';
import { EventHandleResultDto } from './dto/event-handle-result.dto';
import { EventsAuthGuard } from './events-auth.guard';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth('events-token')
@Controller('events')
@UseGuards(EventsAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Принять событие и поставить доставку в очередь',
    description:
      'Универсальный вход для любого источника. Маршрутизация — по client + type.',
  })
  @ApiOkResponse({ type: EventHandleResultDto })
  @ApiBadRequestResponse({
    description: 'Невалидный JSON или клиент неактивен',
  })
  @ApiUnauthorizedResponse({ description: 'Нет или неверный EVENTS_API_TOKEN' })
  @ApiNotFoundResponse({ description: 'Неизвестный client или type' })
  ingest(@Body() dto: CreateEventDto) {
    return this.eventsService.handle(dto);
  }
}
