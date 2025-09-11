import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum ItemCondition {
  NEW = 'New',
  LIKE_NEW = 'Like New',
  GOOD = 'Good',
  FAIR = 'Fair',
}

export class CreateItemDto {
  @ApiProperty({ example: 'iPhone 13 Pro Max', description: 'Item title' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Excellent condition iPhone with original box', description: 'Item description' })
  @IsString()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ example: 899.99, description: 'Item price' })
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  price: number;

  @ApiProperty({ example: 1200.00, description: 'Maximum acceptable price (for negotiation)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  maxPrice?: number;

  @ApiProperty({ example: 1, description: 'Available quantity' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiProperty({ example: 'Electronics', description: 'Item category' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'Like New', description: 'Item condition' })
  @IsEnum(ItemCondition)
  condition: ItemCondition;

  @ApiProperty({ example: false, description: 'Whether to hide seller identity', required: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}