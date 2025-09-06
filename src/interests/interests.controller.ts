import { Controller, Get, Post, Body, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InterestsService } from './interests.service';
import { CreateInterestDto } from './dto/create-interest.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('interests')
@Controller('interests')
@ApiBearerAuth()
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Post()
  @ApiOperation({ summary: 'Show interest in item' })
  @ApiResponse({ status: 201, description: 'Interest created successfully' })
  async create(@Body() createInterestDto: CreateInterestDto, @CurrentUser() user: User) {
    return this.interestsService.create(createInterestDto, user.id);
  }

  @Get('item/:itemId')
  @ApiOperation({ summary: 'Get interests for item' })
  @ApiResponse({ status: 200, description: 'Interests retrieved successfully' })
  async findByItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.interestsService.findByItem(itemId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user interests' })
  @ApiResponse({ status: 200, description: 'User interests retrieved successfully' })
  async findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.interestsService.findByUser(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove interest' })
  @ApiResponse({ status: 200, description: 'Interest removed successfully' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.interestsService.remove(id, user.id);
  }
}