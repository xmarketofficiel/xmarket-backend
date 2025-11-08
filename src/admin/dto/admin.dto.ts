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

import { IsEmail, IsString, IsEnum, MinLength, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
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

  @ApiProperty({ example: 'John', description: 'First name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'Computer Science', description: 'Department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 'student', description: 'User role type', enum: ['student', 'staff', 'seller'], required: false })
  @IsOptional()
  @IsEnum(['student', 'staff', 'seller'])
  userRole?: 'student' | 'staff' | 'seller';

  @ApiProperty({ example: '123 Main St, City', description: 'User address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'user', description: 'System role', enum: ['user', 'admin', 'super_admin'], required: false })
  @IsOptional()
  @IsEnum(['user', 'admin', 'super_admin'])
  role?: 'user' | 'admin' | 'super_admin';

  @ApiProperty({ example: 'active', description: 'Account status', enum: ['active', 'suspended', 'banned'], required: false })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'banned'])
  status?: 'active' | 'suspended' | 'banned';

  @ApiProperty({ example: true, description: 'Is email verified', required: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({ example: true, description: 'Show sold items on profile', required: false })
  @IsOptional()
  @IsBoolean()
  showSoldItems?: boolean;

  @ApiProperty({ example: true, description: 'Show purchases on profile', required: false })
  @IsOptional()
  @IsBoolean()
  showPurchases?: boolean;

  @ApiProperty({ example: false, description: 'Show phone number on profile', required: false })
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
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
