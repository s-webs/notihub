import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness: процесс жив (без Postgres/Redis)' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  live() {
    return this.health.live();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness: Postgres и Redis отвечают',
    description: 'HTTP 503, если зависимость недоступна.',
  })
  @ApiOkResponse({
    schema: { example: { status: 'ok', postgres: true, redis: true } },
  })
  ready() {
    return this.health.ready();
  }
}
