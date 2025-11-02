import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: Authentication required');
    }

    // Check if user is from admin_users table (has type: 'admin')
    if (user.type === 'admin' && user.isAdmin) {
      return true; // Admin users from admin_users table have full access
    }

    // Check if regular user has admin role
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Admin privileges required');
    }

    return true;
  }
}
