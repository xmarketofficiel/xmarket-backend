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

export interface CreateAdminDto {
  fullName: string;
  email: string;
  whatsappNumber: string;
  password: string;
  role: 'admin' | 'super_admin';
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  whatsappNumber: string;
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

export interface BulkActionDto {
  userIds: number[];
  action: 'suspend' | 'activate' | 'ban' | 'delete';
  reason?: string;
}
