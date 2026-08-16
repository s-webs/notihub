import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  telegramToken!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBotDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telegramToken?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
