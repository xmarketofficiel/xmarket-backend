import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInterestDto {
  @ApiProperty({ example: 1, description: 'Item ID' })
  @IsNumber()
  itemId: number;

  @ApiProperty({ required: false, example: 'Is this still available?', description: 'Optional message' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}