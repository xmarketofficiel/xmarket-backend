import { IsEmail, IsString, IsPhoneNumber, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteRegistrationDto {
  @ApiProperty({ example: 'john.doe@university.edu', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsOptional()
  // @IsString()
  // @MinLength(2)
  // @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '+1234567890', description: 'WhatsApp number' })
  @IsPhoneNumber()
  whatsappNumber: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}