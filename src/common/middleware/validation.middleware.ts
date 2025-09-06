import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Skip validation for GET requests and file uploads
    if (req.method === 'GET' || req.headers['content-type']?.includes('multipart/form-data')) {
      return next();
    }

    // Additional validation can be added here
    // For now, we'll let the built-in ValidationPipe handle most validation
    next();
  }
}