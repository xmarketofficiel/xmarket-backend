import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Title of the service',
    example: 'Carpooling to Rabat',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the service',
    example: 'Offering carpooling service from campus to Rabat city center. Comfortable ride with air conditioning.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Price of the service',
    example: 50.00,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @ApiProperty({
    description: 'Service category slug or ID',
    example: 'covoiturage',
  })
  @IsString()
  @IsNotEmpty()
  serviceCategoryId: string;

  @ApiProperty({
    description: 'Service type',
    enum: ['time-based', 'ongoing'],
    example: 'time-based',
  })
  @IsEnum(['time-based', 'ongoing'])
  type: string;

  @ApiProperty({
    description: 'Departure time for time-based services',
    example: '2024-12-15T14:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiProperty({
    description: 'Location where the service is provided',
    example: 'UM6P Campus',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}