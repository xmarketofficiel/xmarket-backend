import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ContactStatus } from '../entities/contact-event.entity';

export class UpdateContactStatusDto {
  @ApiProperty({
    description: 'New status for the contact',
    enum: ContactStatus,
    example: ContactStatus.COMPLETED,
  })
  @IsEnum(ContactStatus)
  status: ContactStatus;

  @ApiProperty({
    description: 'Optional feedback from customer',
    example: 'Great service, very professional!',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerFeedback?: string;
}
