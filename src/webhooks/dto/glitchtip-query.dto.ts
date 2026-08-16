import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GlitchTipQueryDto {
  @ApiProperty({
    example: 'almaty-foods',
    description: 'slug клиента NotiHub',
  })
  @IsString()
  @IsNotEmpty()
  client!: string;

  @ApiProperty({
    required: false,
    description:
      'Секрет webhook, если нельзя передать заголовок X-Notihub-Webhook-Secret',
  })
  @IsOptional()
  @IsString()
  secret?: string;
}
