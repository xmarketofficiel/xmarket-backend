import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the other participant' })
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiPropertyOptional({ description: 'Optional item ID for item-based conversations' })
  @IsOptional()
  @IsString()
  itemId?: string;
}
