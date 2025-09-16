import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { Reflector } from '@nestjs/core';
  import { Request } from 'express';
  import { ConfigService } from '@nestjs/config';
  
  @Injectable()
  export class JwtAuthGuard implements CanActivate {
    constructor(
      private jwtService: JwtService,
      private configService: ConfigService,
    ) {}
  
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromRequest(request);
      if (!token) throw new UnauthorizedException('Missing token');
  
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
  
        request['user'] = payload; // Make user available in request
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
      }
  
      return true;
    }
  
    private extractTokenFromRequest(request: Request): string | undefined {
    // First try to extract from Authorization header (Bearer token - preferred)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // Fallback to cookies (for backward compatibility)
    const cookieToken = request.cookies?.access_token || request.cookies?.admin_token;
    if (cookieToken) {
      return cookieToken;
    }
    
    return undefined;
  }
}