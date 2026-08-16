import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoutingRuleDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  botId!: string;

  @IsString()
  @IsNotEmpty()
  notificationTypeId!: string;

  @IsString()
  @IsNotEmpty()
  chatId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threadId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoutingRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  botId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notificationTypeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chatId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  threadId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
