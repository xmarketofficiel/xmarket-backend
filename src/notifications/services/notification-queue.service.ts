import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, In } from 'typeorm';
import { ContactEvent, ContactStatus } from '../../services/entities/contact-event.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue('follow-up-notifications')
    private followUpQueue: Queue,
    @InjectRepository(ContactEvent)
    private contactEventRepository: Repository<ContactEvent>,
  ) {}

  /**
   * Schedule a follow-up notification for a contact
   * Sends 48-72 hours after initial contact
   */
  async scheduleFollowUp(contactId: string, customerId: number, serviceId: string, sellerId: number) {
    // Schedule for 60 hours from now (2.5 days) - middle of 48-72h window
    const delay = 60 * 60 * 1000; // 60 hours in milliseconds

    await this.followUpQueue.add(
      'send-follow-up',
      {
        contactId,
        customerId,
        serviceId,
        sellerId,
      },
      {
        delay,
        attempts: 3, // Retry up to 3 times if fails
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay, then exponential backoff
        },
        removeOnComplete: true, // Clean up completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );

    this.logger.log(`Scheduled follow-up for contact ${contactId} in 60 hours`);
  }

  /**
   * Daily cron job to queue follow-ups for contacts that are 48-72 hours old
   * Runs every day at 9 AM
   * This is a safety net in case the immediate scheduling fails
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async queuePendingFollowUps() {
    this.logger.log('Starting daily follow-up job...');

    try {
      const now = new Date();
      const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

      // Find contacts that need follow-up
      const contactsNeedingFollowUp = await this.contactEventRepository.find({
        where: {
          status: In([ContactStatus.CONTACTED]),
          isActive: true,
          contactedAt: LessThan(fortyEightHoursAgo),
          followUpSentAt: null,
        },
        relations: ['service', 'customer'],
        order: {
          contactedAt: 'ASC',
        },
      });

      this.logger.log(`Found ${contactsNeedingFollowUp.length} contacts needing follow-up`);

      for (const contact of contactsNeedingFollowUp) {
        // Skip if already in queue
        const existingJob = await this.followUpQueue.getJob(contact.id);
        if (existingJob) {
          this.logger.log(`Follow-up already queued for contact ${contact.id}`);
          continue;
        }

        // Add to queue immediately (no delay since already past 48h)
        await this.followUpQueue.add(
          'send-follow-up',
          {
            contactId: contact.id,
            customerId: contact.customerId,
            serviceId: contact.serviceId,
            sellerId: contact.sellerId,
          },
          {
            jobId: contact.id, // Use contact ID to prevent duplicates
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        this.logger.log(`Queued follow-up for contact ${contact.id}`);
      }

      this.logger.log('Daily follow-up job completed');
    } catch (error) {
      this.logger.error('Error in daily follow-up job:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.followUpQueue.getWaitingCount(),
      this.followUpQueue.getActiveCount(),
      this.followUpQueue.getCompletedCount(),
      this.followUpQueue.getFailedCount(),
      this.followUpQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Cancel a scheduled follow-up
   */
  async cancelFollowUp(contactId: string) {
    const job = await this.followUpQueue.getJob(contactId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled follow-up for contact ${contactId}`);
    }
  }
}
