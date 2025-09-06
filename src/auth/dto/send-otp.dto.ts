import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'john.doe@university.edu', description: 'User email' })
  @IsEmail()
  email: string;
}