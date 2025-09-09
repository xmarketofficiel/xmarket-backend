import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'oussamarabi3i02@gmail.com',
      pass: 'avpx kmtn qluc hrau', // App password (✅ looks correct)
    },
  });
}


  async sendOtpEmail(email: string, otp: string, type: string = 'registration'): Promise<void> {
    const subject = type === 'registration' 
      ? 'Verify Your Email - University Marketplace'
      : 'Password Reset Code - University Marketplace';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">CampusSuperApp</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from University Marketplace. Please do not reply.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('FROM_EMAIL'),
        to: email,
        subject,
        html,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to University Marketplace!</h2>
        <p>Hello ${fullName},</p>
        <p>Welcome to the University Marketplace! Your account has been successfully created.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse items posted by other students</li>
          <li>Post your own items for sale</li>
          <li>Show interest in items you want to buy</li>
          <li>Connect with sellers via WhatsApp</li>
        </ul>
        <p>Happy trading!</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          University Marketplace Team
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('FROM_EMAIL'),
        to: email,
        subject: 'Welcome to University Marketplace!',
        html,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: options.from || this.configService.get('FROM_EMAIL'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }
}