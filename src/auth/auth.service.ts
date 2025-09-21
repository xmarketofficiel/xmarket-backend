import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { JoinRequestsService } from '../join-requests/join-requests.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import { normalizeMoroccanPhone } from '../common/validators/moroccan-phone.validator';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private emailService: EmailService,
    private joinRequestsService: JoinRequestsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    // Normalize email before validation
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    const user = await this.validateUser(normalizedEmail, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Veuillez d\'abord vérifier votre adresse email');
    }

    // Check if user is suspended or banned
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support for assistance.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your account has been banned. Please contact support for assistance.');
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { email } = sendOtpDto;
    
    // Normalize email to lowercase for consistent storage and comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists and is verified
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Cette adresse email est déjà enregistrée. Veuillez vous connecter ou utiliser une autre adresse email.');
    }
    
    // Check email eligibility
    const eligibility = await this.joinRequestsService.checkEmailEligibility(normalizedEmail);
    if (!eligibility.eligible) {
      throw new UnauthorizedException('Cette adresse email n\'est pas autorisée à s\'inscrire. Veuillez soumettre une demande d\'adhésion ou utiliser une adresse email universitaire valide.');
    }

    // Generate and send OTP
    const otp = await this.otpService.generateOtp(normalizedEmail, 'registration');
    await this.emailService.sendOtpEmail(normalizedEmail, otp, 'registration');

    return { 
      message: 'Code de vérification envoyé à votre email',
      eligibilityReason: eligibility.reason
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    
    // Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    const isValid = await this.otpService.verifyOtp(normalizedEmail, otp, 'registration');
    if (!isValid) {
      throw new BadRequestException('Code de vérification invalide ou expiré');
    }

    return { message: 'Code de vérification validé avec succès', verified: true };
  }
  private extractFullName(email: string): string | null {
    if (!email || typeof email !== 'string') return null;

    // Extract just the part before the '@'
    let localPart = email.split('@')[0];

    // Remove '-EXT' if it's an intern
    localPart = localPart.replace(/-EXT$/i, '');

    // Split by dot
    const parts = localPart.split('.');

    if (parts.length !== 2) return null; // Not matching expected format

    const [first, last] = parts;

    // Capitalize first letter of each part
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    return `${capitalize(first)} ${capitalize(last)}`;
  }

  async completeRegistration(completeRegistrationDto: CompleteRegistrationDto) {
    const { email, password, fullName, whatsappNumber } = completeRegistrationDto;

    // Normalize email to lowercase for consistent storage
    const normalizedEmail = email.toLowerCase().trim();
    
    // Normalize phone number to international format (+212...)
    const normalizedPhone = normalizeMoroccanPhone(whatsappNumber);

    // Check if user already exists and is verified
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Cette adresse email est déjà enregistrée et vérifiée.');
    }

    // Use the fullName provided by user, or extract from email as fallback
    const finalFullName = fullName || this.extractFullName(normalizedEmail) || 'User';
    
    // Create or update user
    const userData = {
      email: normalizedEmail, // Store normalized email
      password,
      fullName: finalFullName,
      whatsappNumber: normalizedPhone, // Store normalized phone
    };

    let user;
    if (existingUser) {
      user = await this.usersService.update(existingUser.id, { ...userData, isVerified: true });
    } else {
      user = await this.usersService.create({ ...userData, isVerified: true });
    }

    // Send welcome email - COMMENTED OUT FOR NOW
    // try {
    //   await this.emailService.sendWelcomeEmail(email, finalFullName);
    // } catch (emailError) {
    //   console.warn('Failed to send welcome email:', emailError.message);
    //   // Don't fail the registration if email fails
    // }

    const { passwordHash, ...result } = user;
    
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: result,
    };
  }

  async forgotPassword(email: string) {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const otp = await this.otpService.generateOtp(normalizedEmail, 'password_reset');
    await this.emailService.sendOtpEmail(normalizedEmail, otp, 'password_reset');

    return { message: 'Password reset OTP sent to your email' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await this.otpService.verifyOtp(normalizedEmail, otp, 'password_reset');
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersService.updatePassword(user.id, newPassword);

    return { message: 'Password reset successful' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(newPayload);

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async adminLogin(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Access denied: Admin privileges required');
    }

    // Check if user is active
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your admin account has been suspended. Please contact super admin for assistance.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Your admin account has been banned. Please contact super admin for assistance.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      type: 'admin' 
    };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
      },
    };
  }
}