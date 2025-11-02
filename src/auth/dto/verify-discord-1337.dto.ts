import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyDiscord1337Dto {
  @ApiProperty({ description: 'Discord OAuth authorization code' })
  @IsString()
  code: string;
}
