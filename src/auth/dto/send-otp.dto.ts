import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'john.doe@um6p.ma', description: 'User email' })
  @IsEmail()
  email: string;
}