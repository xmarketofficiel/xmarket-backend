export interface AdminDashboardStats {
  totalUsers: number;
  totalItems: number;
  totalCategories: number;
  totalMessages: number;
  totalReports: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  recentActivity: {
    newUsersToday: number;
    newItemsToday: number;
    newReportsToday: number;
  };
}

export interface AdminUserResponse {
  id: number;
  fullName: string;
  email: string;
  whatsappNumber: string;
  role: string;
  status: string;
  isVerified: boolean;
  lastLogin: Date;
  createdAt: Date;
  itemsCount: number;
  averageRating: number;
}

export interface AdminItemResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  status: string;
  isActive: boolean;
  isSold: boolean;
  seller: {
    id: number;
    fullName: string;
    email: string;
  };
  category: {
    id: number;
    name: string;
  };
  createdAt: Date;
  viewsCount: number;
  favoritesCount: number;
  reportsCount: number;
}

export interface AdminReportResponse {
  id: string; // Changed to string since reports use UUID
  type: 'user' | 'item';
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reportedBy: {
    id: number;
    fullName: string;
    email: string;
  };
  targetUser?: {
    id: number;
    fullName: string;
    email: string;
  };
  targetItem?: {
    id: number;
    name: string;
  };
  seller?: {
    id: number;
    fullName: string;
    email: string;
  };
  adminNotes?: string;
  createdAt: Date;
}

import { IsEmail, IsString, IsEnum, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMoroccanPhone } from '../../common/validators/moroccan-phone.validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'Admin User', description: 'Full name of the admin' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'admin@xmarket.ma', description: 'Admin email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: '0612345678', 
    description: 'Moroccan WhatsApp number (e.g., 0612345678 or +212612345678)' 
  })
  @IsMoroccanPhone({ 
    message: 'Please enter a valid Moroccan phone number (e.g., 0612345678 or +212612345678)' 
  })
  whatsappNumber: string;

  @ApiProperty({ example: 'securepassword123', description: 'Admin password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'admin', description: 'Admin role', enum: ['admin', 'super_admin'] })
  @IsEnum(['admin', 'super_admin'])
  role: 'admin' | 'super_admin';
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'john.doe@university.edu', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: '0612345678', 
    description: 'Moroccan WhatsApp number (e.g., 0612345678 or +212612345678)' 
  })
  @IsMoroccanPhone({ 
    message: 'Please enter a valid Moroccan phone number (e.g., 0612345678 or +212612345678)' 
  })
  whatsappNumber: string;

  @ApiProperty({ example: 'userpassword123', description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;
}

export interface CreateItemDto {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair';
  quantity?: number; // Optional - defaults to 1
  sellerId?: number; // Optional - admin can create items for specific users
}

export interface UpdateUserStatusDto {
  status: 'active' | 'suspended' | 'banned';
  reason?: string;
}

export interface UpdateItemStatusDto {
  isActive: boolean;
  reason?: string;
}

export interface BulkActionDto {
  userIds: number[];
  action: 'suspend' | 'activate' | 'ban' | 'delete';
  reason?: string;
}
