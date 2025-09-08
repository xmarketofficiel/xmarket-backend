import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { EmailService } from '../email/email.service';
import { JoinRequestsService } from '../join-requests/join-requests.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import { JoinRequest } from '../join-requests/entities/join-request.entity';
import { JoinRequestStatus } from '../join-requests/enums/join-request-status.enum';
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
    @InjectRepository(JoinRequest)
    private joinRequestRepository: Repository<JoinRequest>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
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
    
    // Check email eligibility first
    const eligibility = await this.joinRequestsService.checkEmailEligibility(email);
    if (!eligibility.eligible) {
      throw new UnauthorizedException('This email is not authorized to register. Please submit a join request first or use a valid university email.');
    }
    
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Email already registered and verified');
    }

    // Generate and send OTP
    const otp = await this.otpService.generateOtp(email, 'registration');
    await this.emailService.sendOtpEmail(email, otp, 'registration');

    return { 
      message: 'OTP sent to your email',
      eligibilityReason: eligibility.reason
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    
    const isValid = await this.otpService.verifyOtp(email, otp, 'registration');
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    return { message: 'OTP verified successfully', verified: true };
  }
  extractFullName(email: string): string | null {
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

    // Check if user already exists and is verified
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Email already registered and verified');
    }

    // Use the fullName provided by user, or extract from email as fallback
    const finalFullName = fullName || this.extractFullName(email) || 'User';
    
    // Create or update user
    const userData = {
      email,
      password,
      fullName: finalFullName,
      whatsappNumber,
    };

    let user;
    if (existingUser) {
      user = await this.usersService.update(existingUser.id, { ...userData, isVerified: true });
    } else {
      user = await this.usersService.create({ ...userData, isVerified: true });
    }

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(email, finalFullName);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError.message);
      // Don't fail the registration if email fails
    }

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
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const otp = await this.otpService.generateOtp(email, 'password_reset');
    await this.emailService.sendOtpEmail(email, otp, 'password_reset');

    return { message: 'Password reset OTP sent to your email' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const isValid = await this.otpService.verifyOtp(email, otp, 'password_reset');
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.usersService.findByEmail(email);
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
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is suspended or banned');
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

  // Join Request methods
  async createJoinRequest(createJoinRequestDto: CreateJoinRequestDto): Promise<JoinRequest> {
    // Check if user already has a pending request
    const existingRequest = await this.joinRequestRepository.findOne({
      where: {
        email: createJoinRequestDto.email,
        status: JoinRequestStatus.PENDING
      }
    });

    if (existingRequest) {
      throw new ConflictException('You already have a pending request');
    }

    // Check if user is already registered
    const existingUser = await this.usersService.findByEmail(createJoinRequestDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const joinRequest = this.joinRequestRepository.create(createJoinRequestDto);
    return this.joinRequestRepository.save(joinRequest);
  }

  async updateJoinRequest(
    id: number, 
    updateJoinRequestDto: UpdateJoinRequestDto,
    adminId: number
  ): Promise<JoinRequest> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id }
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    // Update the request
    Object.assign(joinRequest, updateJoinRequestDto);
    joinRequest.reviewedBy = adminId;
    joinRequest.reviewedAt = new Date();

    return this.joinRequestRepository.save(joinRequest);
  }

  async getAllJoinRequests(status?: string): Promise<JoinRequest[]> {
    const query = this.joinRequestRepository.createQueryBuilder('joinRequest');

    if (status) {
      query.where('joinRequest.status = :status', { status });
    }

    return query
      .orderBy('joinRequest.createdAt', 'DESC')
      .getMany();
  }
}