import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('items')
  @ApiOperation({ summary: 'Search items' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchItems(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('minPrice', ParseIntPipe) minPrice?: number,
    @Query('maxPrice', ParseIntPipe) maxPrice?: number,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    const result = await this.searchService.searchItems(query, {
      category,
      minPrice,
      maxPrice,
      page,
      limit,
    });
    
    return {
      success: true,
      data: result,
      message: 'Search completed successfully'
    };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions retrieved successfully' })
  async getSearchSuggestions(@Query('query') query: string) {
    return this.searchService.getSearchSuggestions(query);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches' })
  @ApiResponse({ status: 200, description: 'Popular searches retrieved successfully' })
  async getPopularSearches() {
    return this.searchService.getPopularSearches();
  }

  @Post('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save search to history' })
  @ApiResponse({ status: 201, description: 'Search saved to history' })
  async saveSearch(
    @Body('query') query: string,
    @CurrentUser() user: User,
  ) {
    return this.searchService.saveSearch(query, user.id);
  }

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search history' })
  @ApiResponse({ status: 200, description: 'Search history retrieved successfully' })
  async getSearchHistory(@CurrentUser() user: User) {
    return this.searchService.getSearchHistory(user.id);
  }

  @Delete('history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear search history' })
  @ApiResponse({ status: 200, description: 'Search history cleared successfully' })
  async clearSearchHistory(@CurrentUser() user: User) {
    return this.searchService.clearSearchHistory(user.id);
  }
}
