import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMoroccanPhone } from '../../common/validators/moroccan-phone.validator';

export class CreateJoinRequestDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Computer Science', description: 'Department' })
  @IsNotEmpty()
  @IsString()
  department: string;

  @ApiProperty({ 
    example: 'seller', 
    description: 'Role of the user',
    enum: ['seller']
  })
  @IsEnum(['seller']) 
  role: 'seller';

  @ApiProperty({ example: '123 Main Street, City, Country', description: 'Address' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'john.doe@university.edu', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: '0612345678', 
    description: 'Moroccan WhatsApp number (e.g., 0612345678 or +212612345678)' 
  })
  @IsMoroccanPhone({ 
    message: 'Please enter a valid Moroccan phone number (e.g., 0612345678 or +212612345678)' 
  })
  whatsappNumber: string;

  // Legacy field for backward compatibility
  @ApiProperty({ example: 'John Doe', description: 'Full name (legacy)' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
