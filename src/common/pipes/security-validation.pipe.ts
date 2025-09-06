import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Enhanced Validation Pipe with Security Features
 * Provides input sanitization, validation, and protection against common attacks
 */
@Injectable()
export class SecurityValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: any): Promise<any> {
    // Skip validation for basic types and undefined/null values
    if (!metadata.metatype || this.toValidate(metadata.metatype) || value === undefined || value === null) {
      return value;
    }

    // Sanitize input to prevent XSS and injection attacks
    const sanitizedValue = this.sanitizeInput(value);

    // Transform and validate
    const object = plainToInstance(metadata.metatype, sanitizedValue);
    const errors = await validate(object);

    if (errors.length > 0) {
      // Enhanced error messages that don't expose internal structure
      const errorMessages = errors.map(error => {
        const constraints = Object.values(error.constraints || {});
        return constraints.join(', ');
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
        timestamp: new Date().toISOString(),
      });
    }

    return object;
  }

  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Sanitize input to prevent XSS, SQL injection, and other attacks
   */
  private sanitizeInput(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object') {
      const sanitized: any = {};
      for (const key in input) {
        if (input.hasOwnProperty(key)) {
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Sanitize string input to prevent various attacks
   */
  private sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove null bytes (can cause issues with C-based systems)
    let sanitized = input.replace(/\0/g, '');

    // Prevent script injection by encoding dangerous characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Remove potential SQL injection patterns (basic protection)
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(--|\#|\/\*|\*\/)/g,
      /(\bor\b\s+\b\d+\s*=\s*\d+)/gi,
      /(\band\b\s+\b\d+\s*=\s*\d+)/gi,
    ];

    sqlPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        // Log potential SQL injection attempt
        console.warn(`Potential SQL injection attempt detected: ${sanitized}`);
        // Replace with safe placeholder
        sanitized = sanitized.replace(pattern, '[FILTERED]');
      }
    });

    // Limit string length to prevent DoS attacks
    const MAX_STRING_LENGTH = 10000;
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
    }

    return sanitized.trim();
  }
}

/**
 * Enhanced Pagination Parameters with Security Validation
 */
export class SecurePaginationDto {
  page?: number = 1;
  limit?: number = 20;

  constructor(query: any) {
    // Secure pagination parameter validation
    this.page = this.validatePositiveInteger(query.page, 1, 1, 1000);
    this.limit = this.validatePositiveInteger(query.limit, 20, 1, 100);
  }

  private validatePositiveInteger(value: any, defaultValue: number, min: number, max: number): number {
    const parsed = parseInt(value);
    
    if (isNaN(parsed) || parsed < min || parsed > max) {
      return defaultValue;
    }
    
    return parsed;
  }
}

/**
 * Security headers middleware configuration
 */
export const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Strict transport security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Content Security Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
