import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { recipient: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      success: true,
      data: notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(userId: number, notificationId: string) {
    const result = await this.notificationRepository.update(
      { id: notificationId, recipient: { id: userId } },
      { isRead: true },
    );

    return {
      success: result.affected > 0,
      message: result.affected > 0 ? 'Notification marked as read' : 'Notification not found',
    };
  }

  async markAllAsRead(userId: number) {
    await this.notificationRepository.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  async getUnreadCount(userId: number) {
    const count = await this.notificationRepository.count({
      where: { recipient: { id: userId }, isRead: false },
    });

    return {
      success: true,
      data: { count },
    };
  }

  async deleteNotification(userId: number, notificationId: string) {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      recipient: { id: userId },
    });

    return {
      success: result.affected > 0,
      message: result.affected > 0 ? 'Notification deleted' : 'Notification not found',
    };
  }

  // Internal method to create notifications
  async createNotification(
    recipient: User,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
    const notification = this.notificationRepository.create({
      recipient,
      type,
      title,
      message,
      data,
    });

    await this.notificationRepository.save(notification);
    return notification;
  }

  // Helper methods for common notifications
  async notifyNewMessage(recipient: User, senderName: string, itemTitle: string) {
    return this.createNotification(
      recipient,
      NotificationType.MESSAGE,
      'New message',
      `${senderName} sent you a message about "${itemTitle}"`,
      { type: 'message' },
    );
  }

  async notifyItemInterest(recipient: User, interestedUserName: string, itemTitle: string) {
    return this.createNotification(
      recipient,
      NotificationType.ITEM_INTEREST,
      'Someone is interested in your item',
      `${interestedUserName} is interested in "${itemTitle}"`,
      { type: 'item_interest' },
    );
  }

  async notifyItemSold(recipient: User, itemTitle: string) {
    return this.createNotification(
      recipient,
      NotificationType.ITEM_SOLD,
      'Item sold',
      `Your item "${itemTitle}" has been marked as sold`,
      { type: 'item_sold' },
    );
  }
}
