import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { InterestsModule } from './interests/interests.module';
import { UploadsModule } from './uploads/uploads.module';
import { EmailModule } from './email/email.module';
import { OtpModule } from './otp/otp.module';
import { ServicesModule } from './services/services.module';
import { MessagesModule } from './messages/messages.module';
import { SearchModule } from './search/search.module';
import { CategoriesModule } from './categories/categories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { CommonModule } from './common/common.module';
import { ValidationMiddleware } from './common/middleware/validation.middleware';
import { ErrorHandlingInterceptor } from './common/interceptors/error-handling.interceptor';
import { SecurityValidationPipe } from './common/pipes/security-validation.pipe';
import { User } from './users/entities/user.entity';
import { Item } from './items/entities/item.entity';
import { ItemImage } from './items/entities/item-image.entity';
import { Interest } from './interests/entities/interest.entity';
import { Otp } from './otp/entities/otp.entity';
import { Rating } from './services/entities/rating.entity';
import { Service } from './services/entities/service.entity';
import { Conversation } from './messages/entities/conversation.entity';
import { Message } from './messages/entities/message.entity';
import { SearchHistory } from './search/entities/search-history.entity';
import { Category } from './categories/entities/category.entity';
import { Notification } from './notifications/entities/notification.entity';
import { ItemFavorite } from './items/entities/item-favorite.entity';
import { ItemReport } from './items/entities/item-report.entity';
import { ItemPurchase } from './items/entities/item-purchase.entity';
import { UserFollow } from './users/entities/user-follow.entity';
import { UserBlock } from './users/entities/user-block.entity';
import { UserReport } from './users/entities/user-report.entity';
import { WaitlistEmail } from './entities/waitlist-email.entity';
import { JoinRequest } from './join-requests/entities/join-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Support for DATABASE_URL (with SSL) or individual DATABASE_* variables
        const databaseUrl = configService.get('DATABASE_URL');
        
        if (databaseUrl) {
          // Parse the DATABASE_URL to extract connection details
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            entities: [
              User, 
              Item, 
              ItemImage, 
              Interest, 
              Otp, 
              Rating, 
              Service,
              Conversation,
              Message,
              SearchHistory,
              Category,
              Notification,
              ItemFavorite,
              ItemReport,
              ItemPurchase,
              UserFollow,
              UserBlock,
              UserReport,
              WaitlistEmail,
              JoinRequest
            ],
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development',
            // SSL configuration for production (AWS RDS)
            // This fixes the "self-signed certificate in certificate chain" error
            ssl: process.env.NODE_ENV === 'production' || url.searchParams.get('sslmode') === 'require' ? {
              rejectUnauthorized: false,
              ca: undefined, // Don't require CA validation
            } : false,
          };
        }

        // Fallback to individual DATABASE_* environment variables
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: +configService.get('DATABASE_PORT'),
          username: configService.get('DATABASE_USERNAME'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          entities: [
            User, 
            Item, 
            ItemImage, 
            Interest, 
            Otp, 
            Rating, 
            Service,
            Conversation,
            Message,
            SearchHistory,
            Category,
            Notification,
            ItemFavorite,
            ItemReport,
            ItemPurchase,
            UserFollow,
            UserBlock,
            UserReport,
            WaitlistEmail,
            JoinRequest
          ],
          synchronize: process.env.NODE_ENV === 'development',
          logging: process.env.NODE_ENV === 'development',
          // SSL configuration for production (AWS RDS)
          // This fixes the "self-signed certificate in certificate chain" error
          ssl: process.env.NODE_ENV === 'production' || configService.get('DATABASE_SSL') === 'true' ? {
            rejectUnauthorized: false,
            ca: undefined, // Don't require CA validation
          } : false,
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot(
      {
        ttl: 60000,
        limit: 100,
      },
    ),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    UsersModule,
    ItemsModule,
    InterestsModule,
    UploadsModule,
    EmailModule,
    OtpModule,
    ServicesModule,
    MessagesModule,
    SearchModule,
    CategoriesModule,
    NotificationsModule,
    AdminModule,
    WaitlistModule,
    JoinRequestsModule,
    CommonModule,
  ],
  providers: [
    // Global error handling interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlingInterceptor,
    },
    // Note: SecurityValidationPipe disabled globally to prevent query parameter issues
    // Can be applied selectively to specific endpoints that need it
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ValidationMiddleware)
      .forRoutes('*');
  }
}