import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Global Error Handling Interceptor
 * Provides comprehensive error logging, response sanitization, and security measures
 */
@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const userAgent = request.get('User-Agent') || 'Unknown';
    const ip = request.ip || request.connection.remoteAddress || 'Unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log validation errors with full details
        if (error instanceof HttpException && error.getStatus() === 400) {
          const errorResponse = error.getResponse();
          this.logger.error(
            `[${request.method}] ${request.url} - Validation Error - Status: 400 - Duration: ${duration}ms`,
            JSON.stringify(errorResponse, null, 2)
          );
        } else {
          // Basic error logging for other errors
          this.logger.error(
            `[${request.method}] ${request.url} - Error: ${error.message} - Status: ${error.status || 500} - Duration: ${duration}ms`,
            error.stack
          );
        }

        // Simple error sanitization
        const sanitizedError = this.sanitizeError(error);
        return throwError(() => sanitizedError);
      })
    );
  }

  /**
   * Detect and log potential security threats
   */
  private detectSecurityThreats(request: Request, error: any) {
    const suspiciousPatterns = [
      /(\<script.*?\>|javascript:|data:text\/html)/i,  // XSS attempts
      /(union|select|insert|delete|drop|create|alter|exec|execute)/i,  // SQL injection
      /(\.\.|\/etc\/passwd|\.\.\/|\.\.\\)/i,  // Path traversal
      /(eval\(|exec\(|system\(|shell_exec|passthru)/i,  // Code injection
      /(\<\?php|\<\%)/i,  // Code injection attempts
    ];

    const userInput = JSON.stringify({
      body: request.body,
      query: request.query,
      params: request.params,
      headers: {
        'user-agent': request.get('User-Agent'),
        'referer': request.get('Referer'),
        'x-forwarded-for': request.get('X-Forwarded-For'),
      }
    });

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userInput));

    if (isSuspicious) {
      this.logger.warn(`[SECURITY ALERT] Potential attack detected - IP: ${request.ip} - URL: ${request.url} - UserAgent: ${request.get('User-Agent')} - Error: ${error.message}`);
      
      // In production, you might want to:
      // 1. Block the IP temporarily
      // 2. Send alert to security team
      // 3. Log to external security monitoring system
    }

    // Detect brute force attempts (multiple failed auth requests)
    if (request.url.includes('/auth/') && error.status === 401) {
      this.logger.warn(`[BRUTE FORCE ALERT] Failed authentication - IP: ${request.ip} - URL: ${request.url}`);
    }

    // Detect rate limiting violations
    if (error.status === 429) {
      this.logger.warn(`[RATE LIMIT ALERT] Rate limit exceeded - IP: ${request.ip} - URL: ${request.url}`);
    }
  }

  /**
   * Sanitize error responses to prevent information leakage
   */
  private sanitizeError(error: any): HttpException {
    // Don't expose internal server details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Default safe error response
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      
      // Handle known error types safely
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const responseObj = response as any;
        message = responseObj.message || message;
        
        // Only include error details in development
        if (isDevelopment && responseObj.error) {
          details = responseObj.error;
        }
      }
    } else {
      // Handle non-HTTP exceptions
      if (isDevelopment) {
        message = error.message || message;
        details = error.stack;
      }
      
      // Categorize database errors safely
      if (error.code) {
        switch (error.code) {
          case '23505': // PostgreSQL unique violation
            status = HttpStatus.CONFLICT;
            message = 'Duplicate entry detected';
            break;
          case '23503': // PostgreSQL foreign key violation
            status = HttpStatus.BAD_REQUEST;
            message = 'Invalid reference detected';
            break;
          case '23502': // PostgreSQL not null violation
            status = HttpStatus.BAD_REQUEST;
            message = 'Required field missing';
            break;
          default:
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Database operation failed';
        }
      }
    }

    // Create sanitized error response
    const errorResponse: any = {
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
    };

    // Only include details in development
    if (isDevelopment && details) {
      errorResponse.details = details;
    }

    return new HttpException(errorResponse, status);
  }
}

/**
 * Rate limiting configuration for different endpoints
 * Note: For full rate limiting implementation, install express-rate-limit package
 * npm install express-rate-limit @types/express-rate-limit
 */
export const createRateLimiters = () => {
  // For now, return placeholder functions
  // In production, implement with express-rate-limit or similar
  const createLimiter = (windowMs: number, max: number, message: any) => {
    return (req: any, res: any, next: any) => {
      // Placeholder implementation
      // TODO: Implement actual rate limiting with express-rate-limit
      next();
    };
  };

  // General API rate limiter
  const generalLimiter = createLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // Limit each IP to 100 requests per windowMs
    {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  );

  // Authentication rate limiter (stricter)
  const authLimiter = createLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // Limit each IP to 5 auth attempts per windowMs
    {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    }
  );

  // Favorites rate limiter (moderate)
  const favoritesLimiter = createLimiter(
    1 * 60 * 1000, // 1 minute
    20, // Limit each IP to 20 favorite actions per minute
    {
      error: 'Too many favorite actions, please slow down.',
      retryAfter: '1 minute'
    }
  );

  return {
    general: generalLimiter,
    auth: authLimiter,
    favorites: favoritesLimiter,
  };
};
