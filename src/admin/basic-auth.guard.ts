import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const expectedUser = this.config.get<string>('ADMIN_USER');
    const expectedPassword = this.config.get<string>('ADMIN_PASSWORD');

    if (!expectedUser || !expectedPassword) {
      throw new UnauthorizedException('Admin credentials are not configured');
    }

    const header = request.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      response.setHeader('WWW-Authenticate', 'Basic realm="NotiHub"');
      throw new UnauthorizedException();
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    if (user !== expectedUser || password !== expectedPassword) {
      response.setHeader('WWW-Authenticate', 'Basic realm="NotiHub"');
      throw new UnauthorizedException();
    }

    return true;
  }
}
