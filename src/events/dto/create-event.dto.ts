import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    example: 'almaty-foods',
    description: 'slug клиента из админки',
  })
  @IsString()
  @IsNotEmpty()
  client!: string;

  @ApiProperty({
    example: 'stock_threshold',
    description:
      'Код типа уведомления: price_changed, stock_threshold, debtor, stock_replenished, app_error',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { message: '<b>Низкий остаток</b>\nТовар: Соус' },
    description:
      'Произвольный JSON. Если есть message или text — оно уходит в Telegram как HTML.',
  })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'stock:42:2026-08-16',
    description:
      'Ключ идемпотентности (до 128 символов). Повтор не создаёт дубль.',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotency_key?: string;
}
