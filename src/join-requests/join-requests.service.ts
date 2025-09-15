import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoinRequest } from './entities/join-request.entity';
import { JoinRequestStatus } from './enums/join-request-status.enum';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectRepository(JoinRequest)
    private joinRequestsRepository: Repository<JoinRequest>,
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

    const joinRequest = this.joinRequestsRepository.create(createJoinRequestDto);
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
    
    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.reviewedBy = reviewedBy;
    joinRequest.reviewNotes = reviewNotes;
    joinRequest.reviewedAt = new Date();

    const updatedRequest = await this.joinRequestsRepository.save(joinRequest);
    
    // Send approval email
    await this.sendApprovalEmail(updatedRequest);
    
    return updatedRequest;
  }

  async reject(id: number, reviewedBy: number, reviewNotes?: string): Promise<JoinRequest> {
    const joinRequest = await this.findOne(id);
    
    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.reviewedBy = reviewedBy;
    joinRequest.reviewNotes = reviewNotes;
    joinRequest.reviewedAt = new Date();

    return this.joinRequestsRepository.save(joinRequest);
  }

  private async sendApprovalEmail(joinRequest: JoinRequest): Promise<void> {
    try {
      const signupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup`;
      
      await this.emailService.sendEmail({
        to: joinRequest.email,
        subject: '🎉 Welcome to XMarket! Your request has been approved',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to XMarket!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your join request has been approved</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; margin: 0;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0;">Hi ${joinRequest.fullName}! 👋</h2>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your request to join XMarket has been <strong style="color: #48bb78;">approved</strong>. 
                You can now complete your registration and start exploring our university marketplace.
              </p>
              
              <div style="background: #f7fafc; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 18px;">Next Steps:</h3>
                <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Click the button below to complete your registration</li>
                  <li>Create a secure password for your account</li>
                  <li>Verify your email address</li>
                  <li>Start exploring and selling on XMarket!</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                  Complete Registration →
                </a>
              </div>
              
              <div style="background: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #2d3748; margin: 0 0 10px 0;">📧 Your Registration Details:</h4>
                <p style="color: #4a5568; margin: 5px 0;"><strong>Email:</strong> ${joinRequest.email}</p>
                <p style="color: #4a5568; margin: 5px 0;"><strong>Name:</strong> ${joinRequest.fullName}</p>
                <p style="color: #4a5568; margin: 5px 0;"><strong>WhatsApp:</strong> ${joinRequest.whatsappNumber}</p>
              </div>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions or need help getting started, feel free to reach out to our support team.
                Welcome to the XMarket community! 🚀
              </p>
            </div>
            
            <div style="background: #2d3748; padding: 20px; text-align: center; color: #a0aec0; font-size: 12px;">
              <p style="margin: 0;">© 2025 XMarket - University Marketplace Platform</p>
              <p style="margin: 5px 0 0 0;">This email was sent because your join request was approved.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send approval email:', error);
      // Don't throw error to prevent blocking the approval process
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
