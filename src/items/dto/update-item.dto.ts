import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';
import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum ItemCondition {
  NEW = 'New',
  LIKE_NEW = 'Like New',
  GOOD = 'Good',
  FAIR = 'Fair',
}

export class UpdateItemDto {
  @ApiProperty({ 
    example: 'iPhone 13 Pro Max - Updated Title', 
    description: 'Updated item title',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ 
    example: 'Updated description with more details about the item condition and features', 
    description: 'Updated item description',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ 
    example: 799.99, 
    description: 'Updated item price - will affect pending purchase requests',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  price?: number;

  @ApiProperty({ 
    example: 1000.00, 
    description: 'Updated maximum acceptable price for negotiation', 
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  maxPrice?: number;

  @ApiProperty({ 
    example: 2, 
    description: 'Updated available quantity - cannot be less than pending purchases',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiProperty({ 
    example: 'Electronics', 
    description: 'Updated item category',
    required: false 
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ 
    example: 'Good', 
    description: 'Updated item condition',
    required: false 
  })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @ApiProperty({ 
    example: false, 
    description: 'Updated privacy setting - whether to hide seller identity', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}