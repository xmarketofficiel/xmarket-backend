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
    example: 'student', 
    description: 'Role of the user',
    enum: ['student', 'staff']
  })
  @IsEnum(['student', 'staff'])
  role: 'student' | 'staff';

  @ApiProperty({ example: '123 Main Street, City, Country', description: 'Address' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'john.doe@university.edu', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: '0612345678', 
    description: 'Numéro WhatsApp marocain (Ex: 0612345678 ou +212612345678)' 
  })
  @IsMoroccanPhone({ 
    message: 'Veuillez saisir un numéro de téléphone marocain valide (Ex: 0612345678 ou +212612345678)' 
  })
  whatsappNumber: string;

  // Legacy field for backward compatibility
  @ApiProperty({ example: 'John Doe', description: 'Full name (legacy)' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
