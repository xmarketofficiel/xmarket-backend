import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { Item } from './entities/item.entity';
import { ItemImage } from './entities/item-image.entity';
import { ItemFavorite } from './entities/item-favorite.entity';
import { ItemReport } from './entities/item-report.entity';
import { ItemPurchase } from './entities/item-purchase.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, ItemImage, ItemFavorite, ItemReport, ItemPurchase, Category, User]),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}