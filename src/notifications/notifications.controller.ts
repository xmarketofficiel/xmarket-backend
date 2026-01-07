import { Controller, Get, Param, Patch, Delete, Query, UseGuards, Request, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueueService } from './services/notification-queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, page, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(req.user.id, notificationId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  async deleteNotification(@Request() req, @Param('id') notificationId: string) {
    return this.notificationsService.deleteNotification(req.user.id, notificationId);
  }

  @Get('queue/stats')
  async getQueueStats() {
    return this.notificationQueueService.getQueueStats();
  }
}
