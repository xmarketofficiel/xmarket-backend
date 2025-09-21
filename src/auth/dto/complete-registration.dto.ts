import { IsEmail, IsString, IsPhoneNumber, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMoroccanPhone } from '../../common/validators/moroccan-phone.validator';

export class CompleteRegistrationDto {
  @ApiProperty({ example: 'john.doe@university.edu', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsOptional()
  // @IsString()
  // @MinLength(2)
  // @MaxLength(100)
  fullName: string;

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
}