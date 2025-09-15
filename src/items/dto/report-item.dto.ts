import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReportItemDto {
  @ApiProperty({
    description: 'Reason for reporting the item',
    example: 'Inappropriate Content',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500, { message: 'Reason must be less than 500 characters' })
  reason: string;

  @ApiProperty({
    description: 'Additional details about the report (optional)',
    example: 'This item contains offensive language and inappropriate images',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must be less than 1000 characters' })
  description?: string;
}
