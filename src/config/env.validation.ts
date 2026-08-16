import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? undefined : value,
  )
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 3040 : Number(value),
  )
  @IsInt()
  @Min(1)
  PORT: number = 3040;

  @IsOptional()
  @IsString()
  TELEGRAM_BOT_TOKEN?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 20 : Number(value),
  )
  @IsInt()
  @Min(1)
  TELEGRAM_RATE_LIMIT_PER_SEC: number = 20;

  @IsOptional()
  @IsString()
  ADMIN_USER?: string;

  @IsOptional()
  @IsString()
  ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  EVENTS_API_TOKEN?: string;

  @IsOptional()
  @IsString()
  GLITCHTIP_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  HUB_ALERT_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  HUB_ALERT_CHAT_ID?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 0 : Number(value),
  )
  @IsInt()
  HUB_ALERT_THREAD_ID: number = 0;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined || value === '' ? 10 : Number(value),
  )
  @IsInt()
  @Min(1)
  HUB_ALERT_FAIL_THRESHOLD: number = 10;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
