import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchServicesDto {
  @ApiProperty({
    description: 'Filter by service category ID (UUID)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Search term for service title or description',
    example: 'cleaning',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiProperty({
    description: 'Filter by location',
    example: 'New York',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'price', 'averageRating', 'title'],
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'price' | 'averageRating' | 'title';

  @ApiProperty({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
