import { COMMUNITY_EMAIL_PATTERN } from '../../common/community';
import { Matches, IsEmail, IsString, IsPhoneNumber, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'john.doe@um6p.ma', description: 'University email address' })
  @IsEmail()
  @Matches(COMMUNITY_EMAIL_PATTERN, { message: 'Use an @um6p.ma or @student.1337.ma email address.' })
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'WhatsApp number' })
  @IsPhoneNumber()
  whatsappNumber: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: false, description: 'Email verification status', required: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}