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
export class EventsAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('EVENTS_API_TOKEN');
    if (!expected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided =
      bearerToken(request.headers.authorization) ??
      headerValue(request.headers['x-notihub-token']);

    if (!provided || !secretsEqual(expected, provided)) {
      throw new UnauthorizedException('Invalid events API token');
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
