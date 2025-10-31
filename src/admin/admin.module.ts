import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminUser } from './entities/admin-user.entity';
import { User } from '../users/entities/user.entity';
import { Item } from '../items/entities/item.entity';
import { Category } from '../categories/entities/category.entity';
import { Message } from '../messages/entities/message.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { ItemReport } from '../items/entities/item-report.entity';
import { UsersModule } from '../users/users.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUser,
      User,
      Item,
      Category,
      Message,
      UserReport,
      ItemReport,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') || '24h' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ItemsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService],
  exports: [AdminService, AdminAuthService],
})
export class AdminModule {}
