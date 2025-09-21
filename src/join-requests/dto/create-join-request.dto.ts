import { IsEmail, IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMoroccanPhone } from '../../common/validators/moroccan-phone.validator';

export class CreateJoinRequestDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

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
}
