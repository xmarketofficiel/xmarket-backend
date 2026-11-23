import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Service UUID being contacted about',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    description: 'Platform used for contact',
    example: 'whatsapp',
    default: 'whatsapp',
  })
  @IsOptional()
  @IsString()
  platform?: string;
}
