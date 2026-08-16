import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { bearerToken, secretsEqual } from '../common/secrets';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('GLITCHTIP_WEBHOOK_SECRET');
    if (!expected) {
      throw new UnauthorizedException('GlitchTip webhook is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      headerValue(request.headers['x-notihub-webhook-secret']) ??
      bearerToken(request.headers.authorization) ??
      queryValue(request.query.secret);

    if (!provided || !secretsEqual(expected, provided)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function queryValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}
