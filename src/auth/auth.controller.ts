import { Controller, Post, Body, Res, Req, Get, Patch, Param, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateJoinRequestDto } from '../join-requests/dto/create-join-request.dto';
import { UpdateJoinRequestDto } from '../join-requests/dto/update-join-request.dto';
import { JoinRequestsService } from '../join-requests/join-requests.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  // Updated auth controller with admin cookie support
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
  @Post('signup')
  async signup(
    @Body(ValidationPipe) signupDto: CompleteRegistrationDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.completeRegistration(signupDto);
    
    // Set cookies
    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      domain:undefined,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      sameSite: 'none',
      domain:undefined,
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
    
    // Set cookies
    // response.cookie('access_token', result.access_token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production' ? true : false,
    //   sameSite: 'none',
    //   domain:undefined,
    //   maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // });

        response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,              // must be true since Railway is HTTPS
      sameSite: 'none',          // must be 'none' for cross-site
      maxAge: 24 * 60 * 60 * 1000,
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
  async adminLogin(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.adminLogin(loginDto);
    
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
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      domain: undefined,
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
  async checkEligibility(@Body() body: { email: string }) {
    // Simple eligibility check - can be expanded later
    return { eligible: true, message: 'Email is eligible for registration' };
  }

  @Public()
  @Get('debug/cookies')
  @ApiOperation({ summary: 'Debug endpoint to check received cookies' })
  async debugCookies(@Req() request: Request) {
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
}