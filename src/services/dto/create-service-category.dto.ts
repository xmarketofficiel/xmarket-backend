import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';

export class CreateServiceCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @IsEnum(['time-based', 'ongoing', 'both'])
  @IsOptional()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
