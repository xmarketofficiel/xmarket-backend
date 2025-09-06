import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'Profile picture URL', required: false })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({ 
    example: { showSoldItems: true, showPurchases: true, showPhone: false }, 
    description: 'Privacy settings object', 
    required: false 
  })
  @IsOptional()
  @IsObject()
  privacy?: {
    showSoldItems?: boolean;
    showPurchases?: boolean;
    showPhone?: boolean;
  };
}