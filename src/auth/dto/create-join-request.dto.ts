import { IsString, IsEmail, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJoinRequestDto {
  @ApiProperty({ description: 'Full name of the applicant' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Email address of the applicant' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number of the applicant' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ 
    description: 'Affiliation type',
    enum: ['other-university', 'high-school', 'professional', 'researcher', 'other']
  })
  @IsEnum(['other-university', 'high-school', 'professional', 'researcher', 'other'])
  affiliation: string;

  @ApiProperty({ description: 'Reason for wanting to join XMarket' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'University name if applicable' })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({ description: 'Position/role if applicable' })
  @IsOptional()
  @IsString()
  position?: string;
}
