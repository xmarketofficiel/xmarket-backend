import { Controller, Post, Body, Res, Req, Get, Patch, Param, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AdminAuthService } from '../admin/services/admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { VerifyDiscord1337Dto } from './dto/verify-discord-1337.dto';
import { CreateJoinRequestDto } from '../join-requests/dto/create-join-request.dto';
import { UpdateJoinRequestDto } from '../join-requests/dto/update-join-request.dto';
import { JoinRequestsService } from '../join-requests/join-requests.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private adminAuthService: AdminAuthService,
    private joinRequestsService: JoinRequestsService
  ) {}

  @Public()
  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to email for registration' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Public()
  @Post('signup')
  async signup(
    @Body(ValidationPipe) signupDto: CompleteRegistrationDto,
  ) {
    const result = await this.authService.completeRegistration(signupDto);
    
    return {
      message: 'Registration completed successfully',
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async login(
    @Body() loginDto: LoginDto,
  ) {
    const result = await this.authService.login(loginDto);
    
    // Return tokens in response body for Authorization Bearer usage
    return {
      message: 'Login successful',
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login - uses separate admin_users table' })
  @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    // Use AdminAuthService instead of regular AuthService
    const result = await this.adminAuthService.adminLogin(loginDto);
    
    // Set HTTP-only cookies for admin session
    response.cookie('admin_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    response.cookie('admin_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Admin login successful',
      user: result.user,
      token: result.accessToken,
      success: true,
      status: 200,
      data: {
        user: result.user,
        token: result.accessToken
      }
    };
  }

  @Public()
  @Post('admin/logout')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin logged out successfully' })
  async adminLogout(@Res({ passthrough: true }) response: Response) {
    // Clear admin cookies
    response.clearCookie('admin_token');
    response.clearCookie('admin_refresh_token');
    
    return {
      message: 'Admin logout successful',
    };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('verify-reset-otp')
  @ApiOperation({ summary: 'Verify password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyResetOtp(@Body() verifyResetOtpDto: VerifyResetOtpDto) {
    return this.authService.verifyPasswordResetOtp(
      verifyResetOtpDto.email,
      verifyResetOtpDto.code,
    );
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(
    @Req() request: Request,
  ) {
    // Extract refresh token from Authorization header
    const authHeader = request.headers.authorization;
    let refreshToken: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      refreshToken = authHeader.split(' ')[1];
    }
    
    if (!refreshToken) {
      throw new Error('Refresh token not found in Authorization header');
    }

    const result = await this.authService.refreshToken(refreshToken);
    
    return { 
      message: 'Token refreshed successfully',
      access_token: result.access_token,
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout() {
    // With Bearer token authentication, logout is handled client-side
    // by removing tokens from storage
    return { message: 'Logout successful' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  async getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  // Join Request endpoints
  @Public()
  @Post('join-request')
  @ApiOperation({ summary: 'Submit a request to join XMarket' })
  @ApiResponse({ status: 201, description: 'Join request submitted successfully' })
  async createJoinRequest(@Body() createJoinRequestDto: CreateJoinRequestDto) {
    return this.joinRequestsService.create(createJoinRequestDto);
  }

  @Patch('join-request/:id')
  @ApiOperation({ summary: 'Update join request status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request updated successfully' })
  async updateJoinRequest(
    @Param('id') id: number,
    @Body() updateJoinRequestDto: UpdateJoinRequestDto,
    @CurrentUser() user: User
  ) {
    return this.joinRequestsService.update(id, { ...updateJoinRequestDto, reviewedBy: user.id });
  }

  @Get('join-requests')
  @ApiOperation({ summary: 'Get all join requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join requests retrieved successfully' })
  async getAllJoinRequests(@Query('status') status?: string) {
    if (status === 'pending') {
      return this.joinRequestsService.findPending();
    }
    return this.joinRequestsService.findAll();
  }

  @Public()
  @Post('check-eligibility')
  async checkEligibility(@Body() body: { email: string }) {
    // Simple eligibility check - can be expanded later
    return { eligible: true, message: 'Email is eligible for registration' };
  }

  @Get('debug/cookies')
  @ApiOperation({ summary: 'Debug endpoint to check received cookies - Development only' })
  async debugCookies(@Req() request: Request) {
    // Only allow debug endpoint in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Debug endpoints are not available in production');
    }
    return {
      cookies: request.cookies,
      headers: {
        cookie: request.headers.cookie,
        origin: request.headers.origin,
        userAgent: request.headers['user-agent'],
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('discord/verify-1337')
  @ApiOperation({ summary: 'Verify Discord 1337 server membership' })
  @ApiResponse({ status: 200, description: 'Discord verification completed' })
  async verifyDiscord1337(@Body() verifyDto: VerifyDiscord1337Dto) {
    return this.authService.verifyDiscord1337(verifyDto);
  }
}