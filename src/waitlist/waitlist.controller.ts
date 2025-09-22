import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Delete, 
  Param, 
  UseGuards, 
  Request,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { WaitlistEmailService, CreateWaitlistEmailDto } from './waitlist-email.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistEmailService: WaitlistEmailService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Body() createWaitlistEmailDto: CreateWaitlistEmailDto, @Request() req) {
    // Add request metadata
    const emailData = {
      ...createWaitlistEmailDto,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip || req.connection?.remoteAddress,
      referrer: req.headers.referer || req.headers.referrer,
    };

    const result = await this.waitlistEmailService.create(emailData);
    
    return {
      message: 'Successfully subscribed to waitlist',
      email: result.email,
      id: result.id,
    };
  }

  @Public()
  @Get('check/:email')
  async checkSubscription(@Param('email') email: string) {
    const subscription = await this.waitlistEmailService.findByEmail(email);
    return {
      subscribed: !!subscription,
      subscription: subscription || null,
    };
  }

  // Admin-only endpoints
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAllEmails() {
    const emails = await this.waitlistEmailService.findAll();
    return {
      count: emails.length,
      emails,
    };
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getStats() {
    return this.waitlistEmailService.getStats();
  }

  @Post('admin/notify/:email')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async markAsNotified(@Param('email') email: string) {
    await this.waitlistEmailService.markAsNotified(email);
    return {
      message: 'Email marked as notified',
      email,
    };
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.waitlistEmailService.remove(id);
    return {
      message: 'Email removed from waitlist',
      id,
    };
  }
}
