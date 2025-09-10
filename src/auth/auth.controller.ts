import { Controller, Post, Body, Res, Req, UseGuards, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
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
  @Post('complete-registration')
  @ApiOperation({ summary: 'Complete user registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async completeRegistration(
    @Body() completeRegistrationDto: CompleteRegistrationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log("hello")
    const result = await this.authService.completeRegistration(completeRegistrationDto);
    
    // Set cookies with more permissive sameSite for cross-origin requests
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: undefined ,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };

    response.cookie('access_token', result.access_token, cookieOptions);

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: undefined ,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Registration completed successfully',
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    
    // Set cookies with more permissive sameSite for cross-origin requests
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: undefined ,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };

    response.cookie('access_token', result.access_token, cookieOptions);

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: undefined ,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Login successful',
      user: result.user,
    };
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset OTP sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const result = await this.authService.refreshToken(refreshToken);
    
    // Set new access token cookie
    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return { message: 'Token refreshed successfully' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
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
  @ApiOperation({ summary: 'Check if email is eligible for signup' })
  @ApiResponse({ status: 200, description: 'Email eligibility status' })
  checkEligibility(@Body() body: { email: string }) {
    console.log('✅ Auth check eligibility endpoint called with:', body);
    return this.joinRequestsService.checkEmailEligibility(body.email);
  }
}