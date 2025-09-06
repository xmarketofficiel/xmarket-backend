import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
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
      User,
      Item,
      Category,
      Message,
      UserReport,
      ItemReport,
    ]),
    UsersModule,
    ItemsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
