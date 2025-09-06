import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString, IsNumber, IsDate } from 'class-validator';
import { CreateJoinRequestDto } from './create-join-request.dto';
import { JoinRequestStatus } from '../enums/join-request-status.enum';

export class UpdateJoinRequestDto extends PartialType(CreateJoinRequestDto) {
  @IsOptional()
  @IsEnum(JoinRequestStatus)
  status?: JoinRequestStatus;

  @IsOptional()
  @IsNumber()
  reviewedBy?: number;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsDate()
  reviewedAt?: Date;
}
