import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/entities/user.entity';
import { AdminUser, AdminStatus } from '../../admin/entities/admin-user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Check for regular user token first, then admin token
          return request?.cookies?.access_token || request?.cookies?.admin_token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Check if this is an admin token
    if (payload.type === 'admin') {
      const adminUser = await this.adminUserRepository.findOne({
        where: { id: payload.sub }
      });
      
      if (!adminUser) {
        throw new UnauthorizedException('Admin user not found');
      }

      // Check if admin account is active
      if (!adminUser.isActive) {
        throw new UnauthorizedException('Your admin account is inactive. Please contact super admin.');
      }

      if (adminUser.status === AdminStatus.SUSPENDED) {
        throw new UnauthorizedException('Your admin account has been suspended. Please contact super admin.');
      }

      // Return admin user with role mapping for AdminGuard compatibility
      return {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role, // This will be 'admin' or 'super_admin'
        isAdmin: true,
        type: 'admin',
      };
    }

    // Regular user validation
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is suspended or banned
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support for assistance.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your account has been banned. Please contact support for assistance.');
    }

    return user;
  }
}