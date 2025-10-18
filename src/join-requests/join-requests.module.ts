import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JoinRequestsService } from './join-requests.service';
import { JoinRequestsController } from './join-requests.controller';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JoinRequest, User]),
    EmailModule,
  ],
  controllers: [JoinRequestsController],
  providers: [JoinRequestsService],
  exports: [JoinRequestsService],
})
export class JoinRequestsModule {}
