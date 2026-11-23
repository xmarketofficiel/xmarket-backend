import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactEvent, ContactStatus } from '../../services/entities/contact-event.entity';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';

interface FollowUpJobData {
  contactId: string;
  customerId: number;
  serviceId: string;
  sellerId: number;
}

@Processor('follow-up-notifications')
export class FollowUpProcessor {
  private readonly logger = new Logger(FollowUpProcessor.name);

  constructor(
    @InjectRepository(ContactEvent)
    private contactEventRepository: Repository<ContactEvent>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  @Process('send-follow-up')
  async handleFollowUp(job: Job<FollowUpJobData>) {
    const { contactId, customerId, serviceId, sellerId } = job.data;

    this.logger.log(`Processing follow-up for contact ${contactId}`);

    try {
      // Get contact event
      const contact = await this.contactEventRepository.findOne({
        where: { id: contactId, isActive: true },
      });

      if (!contact) {
        this.logger.warn(`Contact ${contactId} not found or inactive`);
        return;
      }

      // Check if already sent follow-up
      if (contact.status === ContactStatus.FOLLOW_UP_SENT || 
          contact.status === ContactStatus.RATED) {
        this.logger.log(`Follow-up already sent for contact ${contactId}`);
        return;
      }

      // Get service details
      const service = await this.serviceRepository.findOne({
        where: { id: serviceId },
      });

      if (!service) {
        this.logger.warn(`Service ${serviceId} not found`);
        return;
      }

      // Get customer details
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
        select: ['id', 'email', 'fullName', 'firstName', 'lastName'],
      });

      if (!customer) {
        this.logger.warn(`Customer ${customerId} not found`);
        return;
      }

      // Get seller details
      const seller = await this.userRepository.findOne({
        where: { id: sellerId },
        select: ['id', 'fullName', 'firstName', 'lastName'],
      });

      const sellerName = seller?.fullName || 
                        `${seller?.firstName} ${seller?.lastName}`.trim() || 
                        'the seller';

      // Send follow-up email
      await this.sendFollowUpEmail(customer, service, sellerName, contactId);

      // Update contact status
      await this.contactEventRepository.update(contactId, {
        status: ContactStatus.FOLLOW_UP_SENT,
        followUpSentAt: new Date(),
      });

      this.logger.log(`Follow-up email sent successfully for contact ${contactId}`);
    } catch (error) {
      this.logger.error(`Failed to process follow-up for contact ${contactId}:`, error);
      throw error; // Let Bull handle retry
    }
  }

  private async sendFollowUpEmail(
    customer: User,
    service: Service,
    sellerName: string,
    contactId: string,
  ) {
    const customerName = customer.fullName || 
                        `${customer.firstName} ${customer.lastName}`.trim() || 
                        'there';

    // Extract first URL from comma-separated FRONTEND_URL (for CORS it may contain multiple URLs)
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0].trim() || 'http://localhost:3000';
    const ratingUrl = `${frontendUrl}/marketplace/services/${service.id}?action=rate&contactId=${contactId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .service-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
          .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .button:hover { background: #0d9488; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 How Was Your Experience?</h1>
          </div>
          <div class="content">
            <p>Hi ${customerName},</p>
            
            <p>We noticed you contacted <strong>${sellerName}</strong> about their service a few days ago:</p>
            
            <div class="service-box">
              <h3>${service.title}</h3>
              <p>${service.description}</p>
              <p><strong>Price:</strong> ${service.priceFrom} MAD${service.priceTo ? ` - ${service.priceTo} MAD` : ''}</p>
            </div>
            
            <p><strong>Did you end up using this service?</strong></p>
            
            <p>If yes, we'd love to hear about your experience! Your feedback helps other students make better decisions and helps ${sellerName} improve their service.</p>
            
            <div style="text-align: center;">
              <a href="${ratingUrl}" class="button">Rate Your Experience ⭐</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              If you didn't use the service or prefer not to rate, you can simply ignore this email.
            </p>
            
            <div class="footer">
              <p>XMarket - University Marketplace</p>
              <p>This is an automated follow-up email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.emailService.sendEmail({
      to: customer.email,
      subject: `How was your experience with ${service.title}?`,
      html: emailHtml,
    });
  }
}
