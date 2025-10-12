import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoinRequest } from './entities/join-request.entity';
import { JoinRequestStatus } from './enums/join-request-status.enum';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { EmailService } from '../email/email.service';
import { normalizeMoroccanPhone } from '../common/validators/moroccan-phone.validator';
import { UserRole } from 'src/users/entities/user.entity';
import { User } from '../users/entities/user.entity';
import * as bcryptjs from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectRepository(JoinRequest)
    private joinRequestsRepository: Repository<JoinRequest>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async create(createJoinRequestDto: CreateJoinRequestDto): Promise<JoinRequest> {
    // Check if email already exists
    const existingRequest = await this.joinRequestsRepository.findOne({
      where: { email: createJoinRequestDto.email }
    });

    if (existingRequest) {
      throw new ConflictException('A request with this email already exists');
    }

    // Normalize phone number before saving
    const normalizedPhone = normalizeMoroccanPhone(createJoinRequestDto.whatsappNumber);

    const joinRequest = this.joinRequestsRepository.create({
      firstName: createJoinRequestDto.firstName,
      lastName: createJoinRequestDto.lastName,
      fullName: createJoinRequestDto.fullName,
      department: createJoinRequestDto.department,
      userRole: createJoinRequestDto.role,
      address: createJoinRequestDto.address,
      email: createJoinRequestDto.email,
      whatsappNumber: normalizedPhone
    });
    return this.joinRequestsRepository.save(joinRequest);
  }

  async findAll(): Promise<JoinRequest[]> {
    return this.joinRequestsRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findPending(): Promise<JoinRequest[]> {
    return this.joinRequestsRepository.find({
      where: { status: JoinRequestStatus.PENDING },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number): Promise<JoinRequest> {
    const joinRequest = await this.joinRequestsRepository.findOne({
      where: { id }
    });

    if (!joinRequest) {
      throw new NotFoundException(`Join request with ID ${id} not found`);
    }

    return joinRequest;
  }

  async update(id: number, updateJoinRequestDto: UpdateJoinRequestDto): Promise<JoinRequest> {
    const joinRequest = await this.findOne(id);
    const oldStatus = joinRequest.status;
    
    // If status is being updated, set reviewed timestamp
    if (updateJoinRequestDto.status && updateJoinRequestDto.status !== joinRequest.status) {
      updateJoinRequestDto.reviewedAt = new Date();
    }

    Object.assign(joinRequest, updateJoinRequestDto);
    const updatedRequest = await this.joinRequestsRepository.save(joinRequest);

    // Send approval email if status changed to approved
    if (oldStatus !== JoinRequestStatus.APPROVED && updateJoinRequestDto.status === JoinRequestStatus.APPROVED) {
      await this.sendApprovalEmail(updatedRequest);
    }

    return updatedRequest;
  }

  async approve(id: number, reviewedBy: number, reviewNotes?: string): Promise<JoinRequest> {
    const joinRequest = await this.findOne(id);
    
    // Generate password and create user account
    const generatedPassword = await this.createUserFromJoinRequest(joinRequest);
    
    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.reviewedBy = reviewedBy;
    joinRequest.reviewNotes = reviewNotes;
    joinRequest.reviewedAt = new Date();

    const updatedRequest = await this.joinRequestsRepository.save(joinRequest);
    
    // Send approval email with generated password
    await this.sendApprovalEmail(updatedRequest, generatedPassword);
    
    return updatedRequest;
  }

  private async createUserFromJoinRequest(joinRequest: JoinRequest): Promise<string> {
    try {
      // Check if user already exists
      const existingUser = await this.usersRepository.findOne({
        where: { email: joinRequest.email }
      });

      if (existingUser) {
        console.log(`User with email ${joinRequest.email} already exists`);
        return null; // Return null if user already exists
      }

      // Generate a random password
      const generatedPassword = crypto.randomBytes(8).toString('hex');
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcryptjs.hash(generatedPassword, saltRounds);

      // Create user account from join request data
      const newUser = this.usersRepository.create({
        fullName: joinRequest.fullName,
        firstName: joinRequest.firstName || joinRequest.fullName?.split(' ')[0] || '',
        lastName: joinRequest.lastName || joinRequest.fullName?.split(' ').slice(1).join(' ') || '',
        email: joinRequest.email,
        whatsappNumber: joinRequest.whatsappNumber,
        department: joinRequest.department,
        userRole: joinRequest.userRole as 'seller',
        address: joinRequest.address,
        passwordHash: hashedPassword,
        isVerified: true, // Auto-verify since admin approved
      });

      await this.usersRepository.save(newUser);
      console.log(`User account created for ${joinRequest.email}`);
      
      return generatedPassword;
    } catch (error) {
      console.error('Failed to create user account:', error);
      return null; // Return null on error
    }
  }

  async reject(id: number, reviewedBy: number, reviewNotes?: string): Promise<JoinRequest> {
    const joinRequest = await this.findOne(id);
    
    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.reviewedBy = reviewedBy;
    joinRequest.reviewNotes = reviewNotes;
    joinRequest.reviewedAt = new Date();

    const updatedRequest = await this.joinRequestsRepository.save(joinRequest);
    
    // Send rejection email
    await this.sendRejectionEmail(updatedRequest);
    
    return updatedRequest;
  }

  private async sendApprovalEmail(joinRequest: JoinRequest, generatedPassword?: string): Promise<void> {
    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
      
      await this.emailService.sendEmail({
        to: joinRequest.email,
        subject: '🎉 Welcome to XMarket! Your account has been created',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to XMarket!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your account has been created successfully</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; margin: 0;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0;">Hi ${joinRequest.fullName}! 👋</h2>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your request to join XMarket has been <strong style="color: #48bb78;">approved</strong> and your account has been created. 
                You can now log in and start exploring our university marketplace.
              </p>
              
              ${generatedPassword ? `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 18px;">🔐 Your Login Credentials:</h3>
                <p style="color: #856404; margin: 5px 0;"><strong>Email:</strong> ${joinRequest.email}</p>
                <p style="color: #856404; margin: 5px 0;"><strong>Password:</strong> <span style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold;">${generatedPassword}</span></p>
                <p style="color: #856404; margin: 10px 0 0 0; font-size: 14px;"><strong>⚠️ Important:</strong> Please change your password after your first login for security.</p>
              </div>
              ` : ''}
              
              <div style="background: #f7fafc; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 18px;">Next Steps:</h3>
                <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Click the button below to log into your account</li>
                  <li>Change your password to something secure and memorable</li>
                  <li>Complete your profile setup</li>
                  <li>Start exploring and selling on XMarket!</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Login to Your Account →
                </a>
              </div>
              
              <div style="background: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #2d3748; margin: 0 0 10px 0;">📧 Your Account Details:</h4>
                <p style="color: #4a5568; margin: 5px 0;"><strong>Email:</strong> ${joinRequest.email}</p>
                <p style="color: #4a5568; margin: 5px 0;"><strong>Name:</strong> ${joinRequest.fullName}</p>
                <p style="color: #4a5568; margin: 5px 0;"><strong>WhatsApp:</strong> ${joinRequest.whatsappNumber}</p>
                <p style="color: #4a5568; margin: 5px 0;"><strong>Department:</strong> ${joinRequest.department || 'Not specified'}</p>
              </div>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions or need help getting started, feel free to reach out to our support team.
                Welcome to the XMarket community! 🚀
              </p>
            </div>
            
            <div style="background: #2d3748; padding: 20px; text-align: center; color: #a0aec0; font-size: 12px;">
              <p style="margin: 0;">© 2025 XMarket - University Marketplace Platform</p>
              <p style="margin: 5px 0 0 0;">This email was sent because your account was created by our admin team.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send approval email:', error);
      // Don't throw error to prevent blocking the approval process
    }
  }

  private async sendRejectionEmail(joinRequest: JoinRequest): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: joinRequest.email,
        subject: 'XMarket Join Request Update',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600;">XMarket</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">University Marketplace Platform</p>
            </div>
            
            <div style="background: white; padding: 40px; border-left: 4px solid #ed8936;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">Join Request Update</h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello ${joinRequest.fullName},
              </p>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in joining XMarket. After careful review, we're unable to approve your join request at this time.
              </p>
              
              ${joinRequest.reviewNotes ? `
                <div style="background: #fef5e7; padding: 20px; border-radius: 8px; border-left: 4px solid #ed8936; margin: 20px 0;">
                  <h4 style="color: #2d3748; margin: 0 0 10px 0;">📝 Review Notes:</h4>
                  <p style="color: #4a5568; margin: 0; font-style: italic;">${joinRequest.reviewNotes}</p>
                </div>
              ` : ''}
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #2d3748; margin: 0 0 15px 0;">📧 What's Next?</h4>
                <p style="color: #4a5568; margin: 0 0 10px 0;">• You can submit a new join request if your situation changes</p>
                <p style="color: #4a5568; margin: 0 0 10px 0;">• Make sure to use your official university email address</p>
                <p style="color: #4a5568; margin: 0;">• Contact our support team if you have questions</p>
              </div>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you believe this was an error or have questions, please contact our support team at support@xmarket.ma
              </p>
            </div>
            
            <div style="background: #2d3748; padding: 20px; text-align: center; color: #a0aec0; font-size: 12px;">
              <p style="margin: 0;">© 2025 XMarket - University Marketplace Platform</p>
              <p style="margin: 5px 0 0 0;">This email was sent regarding your join request status.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send rejection email:', error);
      // Don't throw error to prevent blocking the rejection process
    }
  }

  async checkEmailEligibility(email: string): Promise<{ eligible: boolean; reason: string }> {
    // Check authorized emails (pre-approved specific emails)
    const authorizedEmails = ['anass20142015@gmail.com'];
    if (authorizedEmails.includes(email.toLowerCase())) {
      return { eligible: true, reason: 'authorized_email' };
    }

    // Check university email domains
    const universityDomains = /@(um6p\.ma|emines\.um6p\.ma)$/i;
    if (universityDomains.test(email)) {
      return { eligible: true, reason: 'university_email' };
    }

    // Check if email has approved join request
    const approvedRequest = await this.joinRequestsRepository.findOne({
      where: { 
        email: email,
        status: JoinRequestStatus.APPROVED
      }
    });

    if (approvedRequest) {
      return { eligible: true, reason: 'approved_request' };
    }

    return { eligible: false, reason: 'not_authorized' };
  }

  async remove(id: number): Promise<void> {
    const joinRequest = await this.findOne(id);
    await this.joinRequestsRepository.remove(joinRequest);
  }

  async getStats() {
    const total = await this.joinRequestsRepository.count();
    const pending = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.PENDING }
    });
    const approved = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.APPROVED }
    });
    const rejected = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.REJECTED }
    });

    return {
      total,
      pending,
      approved,
      rejected
    };
  }
}
