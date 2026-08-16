import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventDeliveryDto {
  @ApiProperty({ example: 'clxyz...' })
  routingRuleId!: string;

  @ApiProperty({ example: 'clabc...' })
  logId!: string;

  @ApiProperty({ enum: ['PENDING', 'SENT', 'FAILED'], example: 'PENDING' })
  status!: string;

  @ApiProperty({ nullable: true, example: null })
  error!: string | null;
}

export class EventHandleResultDto {
  @ApiProperty({
    description: 'Сколько активных RoutingRule подошло под client+type',
    example: 1,
  })
  matched!: number;

  @ApiProperty({ example: true })
  queued!: boolean;

  @ApiProperty({ type: [EventDeliveryDto] })
  deliveries!: EventDeliveryDto[];

  @ApiPropertyOptional({
    description: 'true, если событие уже обрабатывалось с этим idempotency_key',
    example: false,
  })
  idempotent?: boolean;
}
