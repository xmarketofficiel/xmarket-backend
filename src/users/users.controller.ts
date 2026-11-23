import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseIntPipe, BadRequestException, Query, DefaultValuePipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: User) {
    const fullUser = await this.usersService.findOne(user.id);
    // Exclude sensitive data before returning
    const { passwordHash, ...safeUser } = fullUser;
    return safeUser;
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    // Exclude sensitive data before returning
    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    
    await this.usersService.changePassword(
      user.id, 
      changePasswordDto.currentPassword, 
      changePasswordDto.newPassword
    );
    
    return { message: 'Password changed successfully' };
  }

  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 7 * 1024 * 1024, // 7MB per file
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updatedUser = await this.usersService.updateProfileImageWithCloudinary(user.id, file);
    // Exclude sensitive data before returning
    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }

  @Get(':id/community')
  @ApiOperation({ summary: 'View a UM6P community member and their active listings' })
  async getCommunityProfile(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.usersService.getCommunityProfile(id, page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get own account details or another member community profile' })
  @ApiResponse({ status: 200, description: 'Marketplace profile retrieved successfully' })
  async getUserProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return id === user.id
      ? this.usersService.getUserProfile(id)
      : this.usersService.getCommunityProfile(id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get user items' })
  @ApiResponse({ status: 200, description: 'User items retrieved successfully' })
  async getUserItems(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    if (id === user.id) return this.usersService.getUserItems(id);
    return (await this.usersService.getCommunityProfile(id)).items;
  }

  @Get(':id/interests')
  @ApiOperation({ summary: 'Get user interests' })
  @ApiResponse({ status: 200, description: 'User interests retrieved successfully' })
  async getUserInterests(@Param('id', ParseIntPipe) id: number) {
    return { message: 'User interests endpoint', userId: id };
  }

  // Following other members remains outside the marketplace scope.
  // @Post(':id/follow')
  @ApiOperation({ summary: 'Toggle follow user' })
  @ApiResponse({ status: 200, description: 'Follow status toggled successfully' })
  async followUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.usersService.followUser(user.id, id);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  async blockUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.usersService.blockUser(user.id, id);
    return { success: true, message: 'User blocked successfully' };
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report user' })
  @ApiResponse({ status: 200, description: 'User reported successfully' })
  async reportUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    await this.usersService.reportUser(user.id, id, reason);
    return { success: true, message: 'User reported successfully' };
  }
}
