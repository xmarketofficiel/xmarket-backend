import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class VerifyDiscord1337Dto {
  @ApiProperty({ description: 'Discord OAuth authorization code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'User email to verify against Discord account' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '1337 login name to verify against Discord username' })
  @IsString()
  loginName: string;
}
