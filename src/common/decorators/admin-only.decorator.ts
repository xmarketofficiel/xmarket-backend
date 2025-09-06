import { UseGuards } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export const AdminOnly = () => UseGuards(JwtAuthGuard, AdminGuard);
