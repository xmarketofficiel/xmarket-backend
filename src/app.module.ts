import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { InterestsModule } from './interests/interests.module';
import { UploadsModule } from './uploads/uploads.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { OtpModule } from './otp/otp.module';
// Services and in-app messaging are retired. Keep their entities for existing data.
import { SearchModule } from './search/search.module';
import { CategoriesModule } from './categories/categories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
// External access requests and waitlists are retired for the community marketplace.
import { CommonModule } from './common/common.module';
import { ValidationMiddleware } from './common/middleware/validation.middleware';
import { ErrorHandlingInterceptor } from './common/interceptors/error-handling.interceptor';
import { SecurityValidationPipe } from './common/pipes/security-validation.pipe';
import { User } from './users/entities/user.entity';
import { Item } from './items/entities/item.entity';
import { ItemImage } from './items/entities/item-image.entity';
import { Interest } from './interests/entities/interest.entity';
import { Otp } from './otp/entities/otp.entity';
import { ServiceCategory } from './services/entities/service-category.entity';
import { Rating } from './services/entities/rating.entity';
import { Service } from './services/entities/service.entity';
import { ContactEvent } from './services/entities/contact-event.entity';
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
import { FeaturedProductsModule } from './featured-products/featured-products.module';
import { FeaturedProduct } from './featured-products/entities/featured-product.entity';
import { AdminUser } from './admin/entities/admin-user.entity';

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
        
        console.log('📊 DATABASE_URL from config:', databaseUrl ? `${databaseUrl.substring(0, 30)}...` : 'NOT SET');
        console.log('📊 All DB env vars:', {
          DATABASE_URL: databaseUrl ? 'SET' : 'NOT SET',
          DATABASE_HOST: configService.get('DATABASE_HOST'),
          DATABASE_PORT: configService.get('DATABASE_PORT'),
          DATABASE_NAME: configService.get('DATABASE_NAME'),
        });
        
        if (databaseUrl && databaseUrl.trim() !== '') {
          // Validate and parse the DATABASE_URL
          let url: URL;
          try {
            url = new URL(databaseUrl);
          } catch (error) {
            throw new Error(
              `Invalid DATABASE_URL format: ${error.message}. ` +
              `Expected format: postgresql://username:password@host:port/database`
            );
          }
          
          console.log('🔗 Connecting to Railway Postgres:', {
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            database: url.pathname.slice(1),
            ssl: 'enabled with rejectUnauthorized=false'
          });
          
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
              ServiceCategory,
              ContactEvent,
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
              JoinRequest,
              FeaturedProduct,
              AdminUser
            ],
            synchronize: false, // Using migrations instead - DO NOT ENABLE
            dropSchema: false, // Never drop existing data
            logging: process.env.NODE_ENV === 'development',
            // Connection timeout settings
            connectTimeoutMS: 30000, // 30 seconds for Railway connection
            extra: {
              connectionTimeoutMillis: 30000,
              query_timeout: 30000,
              statement_timeout: 30000,
              idle_in_transaction_session_timeout: 30000,
            },
            // SSL configuration for Railway - always required
            ssl: {
              rejectUnauthorized: false, // Accept self-signed certificates
            },
            // Railway-specific connection settings
            keepConnectionAlive: true,
            retryAttempts: 3,
            retryDelay: 3000,
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
            ServiceCategory,
            ContactEvent,
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
            JoinRequest,
            FeaturedProduct,
            AdminUser
          ],
          synchronize: false, // Using migrations instead
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('REDIS_URL') || {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT')) || 6379,
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
      }),
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
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      serveStaticOptions: {
        index: false,
      },
    }),
    AuthModule,
    UsersModule,
    ItemsModule,
    InterestsModule,
    UploadsModule,
    StorageModule,
    EmailModule,
    OtpModule,
    SearchModule,
    CategoriesModule,
    NotificationsModule,
    AdminModule,
    FeaturedProductsModule,
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
