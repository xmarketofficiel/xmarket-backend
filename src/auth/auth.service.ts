import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import { normalizeMoroccanPhone } from '../common/validators/moroccan-phone.validator';
import { isCommunityEmail } from '../common/community';
import * as bcrypt from 'bcryptjs';
import { last } from 'rxjs';
import passport from 'passport';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private emailService: EmailService,
  ) {}

  checkEmailEligibility(email: string): { eligible: boolean; reason: string } {
    const eligible = isCommunityEmail(email);
    return { eligible, reason: eligible ? 'university_email' : 'community_only' };
  }

  private createRegistrationToken(email: string): string {
    // A separate signing key prevents membership proofs from acting as login tokens.
    return this.jwtService.sign(
      { email: email.toLowerCase().trim(), verification: 'email-otp', purpose: 'community-registration' },
      { secret: `${this.configService.get<string>('JWT_SECRET')}:community-registration`, expiresIn: '15m' },
    );
  }

  async validateUser(email: string, password: string): Promise<any> {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    console.log('Validating user:', user);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      console.log('User validated successfully:', user.email);
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
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!isCommunityEmail(user.email)) {
      throw new UnauthorizedException('Use your @um6p.ma or @student.1337.ma community account.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email address first');
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
      throw new ConflictException('This email address is already registered. Please log in or use a different email address.');
    }
    
    // Check email eligibility
    const eligibility = this.checkEmailEligibility(normalizedEmail);
    if (!eligibility.eligible) {
      throw new UnauthorizedException('Use an @um6p.ma or @student.1337.ma email address to join the UM6P community.');
    }

    // Generate and send OTP
    const otp = await this.otpService.generateOtp(normalizedEmail, 'registration');
    await this.emailService.sendOtpEmail(normalizedEmail, otp, 'registration');

    return { 
      message: 'Verification code sent to your email',
      eligibilityReason: eligibility.reason
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    
    // Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!this.checkEmailEligibility(normalizedEmail).eligible) {
      throw new UnauthorizedException('Use a community university email address.');
    }

    const isValid = await this.otpService.verifyOtp(normalizedEmail, otp, 'registration');
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      message: 'Verification code validated successfully',
      verified: true,
      registrationToken: this.createRegistrationToken(normalizedEmail),
    };
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
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      department, 
      role, 
      address, 
      whatsappNumber,
      fullName 
    } = completeRegistrationDto;

    // Normalize email to lowercase for consistent storage
    const normalizedEmail = email.toLowerCase().trim();
    
    // Membership must be verified on the server, even when signup is called directly.
    let membership: { email: string; verification: string; purpose: string };
    try {
      membership = this.jwtService.verify(completeRegistrationDto.registrationToken, {
        secret: `${this.configService.get<string>('JWT_SECRET')}:community-registration`,
      });
    } catch {
      throw new UnauthorizedException('Verify your community membership before registering.');
    }
    if (membership.purpose !== 'community-registration' || membership.email !== normalizedEmail ||
        membership.verification !== 'email-otp' || !isCommunityEmail(normalizedEmail)) {
      throw new UnauthorizedException('Registration is limited to verified community students and staff.');
    }

    // Normalize phone number to international format (+212...)
    const normalizedPhone = normalizeMoroccanPhone(whatsappNumber);

    // Check if user already exists and is verified
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('This email address is already registered and verified.');
    }

    // Use provided names or legacy fullName as fallback
    const finalFirstName = firstName || fullName?.split(' ')[0] || this.extractFullName(normalizedEmail) || 'User';
    const finalLastName = lastName || fullName?.split(' ').slice(1).join(' ') || '';
    const finalFullName = `${finalFirstName} ${finalLastName}`.trim();
    
    // Create or update user
    const userData = {
      email: normalizedEmail,
      password,
      firstName: finalFirstName,
      lastName: finalLastName,
      fullName: finalFullName, // Keep for backward compatibility
      department,
      userRole: role,
      address,
      whatsappNumber: normalizedPhone,
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

  /**
   * Forgot Password - Step 1: Send OTP to email
   */
  async forgotPassword(email: string) {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('No account found with this email address');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new BadRequestException('Please verify your account first before resetting your password');
    }

    // Generate and send OTP for password reset
    const otp = await this.otpService.generatePasswordResetOtp(normalizedEmail);
    await this.emailService.sendOtpEmail(normalizedEmail, otp, 'password-reset');

    return { 
      message: 'Password reset code sent to your email. Please check your inbox.',
      email: normalizedEmail
    };
  }

  /**
   * Forgot Password - Step 2: Verify OTP
   */
  async verifyPasswordResetOtp(email: string, code: string) {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if OTP is valid WITHOUT marking it as verified
    // This allows the user to still use it in the reset password step
    const isValid = await this.otpService.checkPasswordResetOtpValid(normalizedEmail, code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    return { 
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true
    };
  }

  /**
   * Forgot Password - Step 3: Reset password with OTP
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify OTP one final time and mark it as verified (consumes the OTP)
    const isValid = await this.otpService.verifyPasswordResetOtp(normalizedEmail, code);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP code. Please request a new one.');
    }

    // Update user password (updatePassword will handle hashing)
    await this.usersService.updatePassword(user.id, newPassword);

    return { 
      message: 'Password reset successfully. You can now log in with your new password.'
    };
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

      if (!isCommunityEmail(user.email)) {
        throw new UnauthorizedException('A UM6P community account is required.');
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

  // Community membership is verified exclusively through university email OTP.
}
