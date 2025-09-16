import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Overloaded method to support both calling patterns
  async sendEmail(emailOptions: { to: string; subject: string; html: string }): Promise<void>;
  async sendEmail(to: string, subject: string, html: string): Promise<void>;
  async sendEmail(
    toOrOptions: string | { to: string; subject: string; html: string },
    subject?: string,
    html?: string
  ): Promise<void> {
    try {
      let emailData: { to: string; subject: string; html: string };
      
      if (typeof toOrOptions === 'string') {
        // Called with separate parameters
        emailData = { to: toOrOptions, subject: subject!, html: html! };
      } else {
        // Called with options object
        emailData = toOrOptions;
      }

      await this.transporter.sendMail({
        from: `${this.configService.get('FROM_NAME')} <${this.configService.get('FROM_EMAIL')}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        replyTo: this.configService.get('REPLY_TO'),
      });
      this.logger.log(`Email sent to ${emailData.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${typeof toOrOptions === 'string' ? toOrOptions : toOrOptions.to}:`, error);
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string, type: string = 'registration'): Promise<void> {
    const subject = type === 'registration' 
      ? 'Verify Your Email - XMarket'
      : 'Password Reset Code - XMarket';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">XMarket</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from XMarket. Please do not reply.
        </p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Welcome to XMarket!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to XMarket, ${firstName}!</h2>
        <p>Thank you for joining our university marketplace community.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse and buy items from other students</li>
          <li>List your own items for sale</li>
          <li>Connect with students at your university</li>
        </ul>
        <p>Happy trading!</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from XMarket.
        </p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }
}
