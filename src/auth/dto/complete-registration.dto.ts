import { IsEmail, IsString, IsPhoneNumber, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMoroccanPhone } from '../../common/validators/moroccan-phone.validator';

export class CompleteRegistrationDto {
  @ApiProperty({ example: 'john.doe@university.edu', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'Computer Science', description: 'Department of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  department: string;

  @ApiProperty({ 
    example: 'student', 
    description: 'Role of the user',
    enum: ['student', 'staff']
  })
  @IsEnum(['student', 'staff'])
  role: 'student' | 'staff';

  @ApiProperty({ example: '123 Main Street, City, Country', description: 'Address of the user' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({ 
    example: '0612345678', 
    description: 'Numéro WhatsApp marocain (Ex: 0612345678 ou +212612345678)' 
  })
  @IsMoroccanPhone({ 
    message: 'Veuillez saisir un numéro de téléphone marocain valide (Ex: 0612345678 ou +212612345678)' 
  })
  whatsappNumber: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  // Legacy field for backward compatibility
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user (legacy)' })
  @IsOptional()
  @IsString()
  fullName?: string;
}