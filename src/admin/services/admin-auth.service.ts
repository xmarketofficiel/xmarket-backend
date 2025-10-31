import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUser, AdminStatus } from '../entities/admin-user.entity';
import { LoginDto } from '../../auth/dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const admin = await this.adminUserRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return admin;
  }

  async adminLogin(loginDto: LoginDto) {
    const admin = await this.validateAdmin(loginDto.email, loginDto.password);
    
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if admin account is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Your admin account is inactive. Please contact super admin.');
    }

    if (admin.status === AdminStatus.SUSPENDED) {
      throw new UnauthorizedException('Your admin account has been suspended. Please contact super admin.');
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    await this.adminUserRepository.update(admin.id, {
      lastLogin: new Date(),
    });

    // Create JWT payload
    const payload = {
      email: admin.email,
      sub: admin.id,
      role: admin.role,
      type: 'admin',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        status: admin.status,
      },
    };
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.adminUserRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  async findById(id: number): Promise<AdminUser | null> {
    return this.adminUserRepository.findOne({
      where: { id },
    });
  }

  async createAdmin(
    email: string,
    password: string,
    fullName: string,
    role: string = 'admin',
  ): Promise<AdminUser> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if admin already exists
    const existingAdmin = await this.findByEmail(normalizedEmail);
    if (existingAdmin) {
      throw new Error('Admin with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = this.adminUserRepository.create({
      email: normalizedEmail,
      passwordHash,
      fullName,
      role: role as any,
      status: AdminStatus.ACTIVE,
      isActive: true,
    });

    return this.adminUserRepository.save(admin);
  }

  async updateAdminStatus(
    id: number,
    status: AdminStatus,
  ): Promise<AdminUser> {
    await this.adminUserRepository.update(id, { status });
    return this.findById(id);
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return this.adminUserRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
