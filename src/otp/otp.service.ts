import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Otp } from './entities/otp.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private configService: ConfigService,
  ) {}

  async generateOtp(email: string, type: string = 'registration'): Promise<string> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (5 minutes from now) - 300000 ms = 5 minutes
    const expiresAt = new Date();
    const expirationTime = parseInt(this.configService.get('OTP_EXPIRES_IN')) || 300000; // Default 5 minutes
    expiresAt.setTime(expiresAt.getTime() + expirationTime);

    // Deactivate any existing OTPs for this email and type
    await this.otpRepository.update(
      { email, type, verified: false },
      { verified: true }
    );

    // Create new OTP
    const otp = this.otpRepository.create({
      email,
      code,
      type,
      expiresAt,
    });

    await this.otpRepository.save(otp);
    return code;
  }
  async verifyEmailIsValid(email: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        type: 'registration',
        verified: true
      },
    });
    
    if (!otp) {
      throw new BadRequestException('Email not verified with OTP');
    }
    
    return true;
  }

  async verifyOtp(email: string, code: string, type: string = 'registration'): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        code,
        type,
        verified: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark OTP as verified
    otp.verified = true;
    await this.otpRepository.save(otp);

    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  /**
   * Generate OTP for password reset
   */
  async generatePasswordResetOtp(email: string): Promise<string> {
    return this.generateOtp(email, 'password-reset');
  }

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOtp(email: string, code: string): Promise<boolean> {
    return this.verifyOtp(email, code, 'password-reset');
  }

  /**
   * Check if OTP is valid without marking it as verified
   * Used for intermediate verification steps
   */
  async checkOtpValid(email: string, code: string, type: string = 'registration'): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        code,
        type,
        verified: false,
      },
    });

    if (!otp) {
      return false;
    }

    // Check if OTP is expired
    if (otp.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Check if password reset OTP is valid without marking as verified
   */
  async checkPasswordResetOtpValid(email: string, code: string): Promise<boolean> {
    return this.checkOtpValid(email, code, 'password-reset');
  }
}
