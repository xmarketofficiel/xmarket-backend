import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJoinRequestDto {
  @ApiPropertyOptional({ 
    description: 'Status of the join request',
    enum: ['pending', 'approved', 'rejected']
  })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Admin notes for the request' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
