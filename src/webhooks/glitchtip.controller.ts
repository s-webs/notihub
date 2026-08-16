import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EventHandleResultDto } from '../events/dto/event-handle-result.dto';
import { EventsService } from '../events/events.service';
import { GlitchTipQueryDto } from './dto/glitchtip-query.dto';
import { mapGlitchTipPayload } from './glitchtip.mapper';
import { WebhookSecretGuard } from './webhook-secret.guard';

@ApiTags('webhooks')
@ApiSecurity('webhook-secret')
@Controller('webhooks')
@UseGuards(WebhookSecretGuard)
export class GlitchTipController {
  constructor(private readonly events: EventsService) {}

  @Post('glitchtip')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook GlitchTip / Sentry-совместимый payload',
    description:
      'Маппит issue/event стороннего сервиса в событие type=app_error и ставит в очередь.',
  })
  @ApiBody({
    description: 'Тело webhook GlitchTip или классический Sentry payload',
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        action: 'created',
        project_name: 'backend',
        data: {
          issue: {
            id: 42,
            title: 'Undefined variable $foo',
            culprit: 'app/Http/Controllers/SaleController.php',
            permalink: 'https://glitchtip.example/issues/42',
            level: 'error',
          },
        },
      },
    },
  })
  @ApiOkResponse({ type: EventHandleResultDto })
  @ApiBadRequestResponse({ description: 'Не указан query client' })
  @ApiUnauthorizedResponse({
    description: 'Нет или неверный GLITCHTIP_WEBHOOK_SECRET',
  })
  @ApiNotFoundResponse({ description: 'Неизвестный client' })
  ingest(@Query() query: GlitchTipQueryDto, @Body() body: unknown) {
    return this.events.handle(mapGlitchTipPayload(query.client.trim(), body));
  }
}
