import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JoinRequestsService } from './join-requests.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('join-requests')
@Controller('join-requests')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new join request' })
  @ApiResponse({ status: 201, description: 'Join request created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() createJoinRequestDto: CreateJoinRequestDto) {
    return this.joinRequestsService.create(createJoinRequestDto);
  }

  @UseGuards( AdminGuard)
  @Get()
  @ApiOperation({ summary: 'Get all join requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all join requests' })
  findAll() {
    return this.joinRequestsService.findAll();
  }

  @UseGuards( AdminGuard)
  @Get('pending')
  @ApiOperation({ summary: 'Get pending join requests (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending join requests' })
  findPending() {
    return this.joinRequestsService.findPending();
  }

  @UseGuards(AdminGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get join request statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request statistics' })
  getStats() {
    return this.joinRequestsService.getStats();
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a join request by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request details' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.joinRequestsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a join request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request updated successfully' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateJoinRequestDto: UpdateJoinRequestDto) {
    return this.joinRequestsService.update(id, updateJoinRequestDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a join request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.joinRequestsService.remove(id);
  }

  @UseGuards( AdminGuard)
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a join request and send email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request approved and email sent' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reviewedBy: number; reviewNotes?: string }
  ) {
    return this.joinRequestsService.approve(id, body.reviewedBy, body.reviewNotes);
  }

  @UseGuards( AdminGuard)
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a join request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Join request rejected' })
  @ApiResponse({ status: 404, description: 'Join request not found' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reviewedBy: number; reviewNotes?: string }
  ) {
    return this.joinRequestsService.reject(id, body.reviewedBy, body.reviewNotes);
  }
}
