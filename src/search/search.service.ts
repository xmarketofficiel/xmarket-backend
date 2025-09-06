import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchHistory } from './entities/search-history.entity';
import { ItemsService } from '../items/items.service';
import { SearchItemsDto } from '../items/dto/search-items.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(SearchHistory)
    private searchHistoryRepository: Repository<SearchHistory>,
    private itemsService: ItemsService,
  ) {}

  async searchItems(query: string, searchParams: SearchItemsDto) {
    // Use the existing items service search functionality
    const searchDto = { ...searchParams, search: query };
    return this.itemsService.findAll(searchDto);
  }

  async getSearchSuggestions(query: string) {
    if (!query || query.length < 2) {
      return {
        success: true,
        data: [],
      };
    }

    // Get suggestions from search history
    const suggestions = await this.searchHistoryRepository
      .createQueryBuilder('search')
      .select('DISTINCT search.searchQuery', 'suggestion')
      .where('search.searchQuery ILIKE :query', { query: `%${query}%` })
      .orderBy('search.searchCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      success: true,
      data: suggestions.map(s => s.suggestion),
    };
  }

  async getPopularSearches() {
    const popularSearches = await this.searchHistoryRepository
      .createQueryBuilder('search')
      .select('search.searchQuery', 'query')
      .addSelect('SUM(search.searchCount)', 'totalCount')
      .groupBy('search.searchQuery')
      .orderBy('totalCount', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      success: true,
      data: popularSearches.map(s => s.query),
    };
  }

  async saveSearch(query: string, userId?: number) {
    if (!query || query.trim().length === 0) {
      return {
        success: true,
        message: 'Empty query not saved',
      };
    }

    if (userId) {
      // Check if user already searched for this
      const existing = await this.searchHistoryRepository.findOne({
        where: { userId, searchQuery: query.trim() },
      });

      if (existing) {
        // Increment search count
        existing.searchCount += 1;
        existing.updatedAt = new Date();
        await this.searchHistoryRepository.save(existing);
      } else {
        // Create new search history entry
        const searchHistory = this.searchHistoryRepository.create({
          userId,
          searchQuery: query.trim(),
        });
        await this.searchHistoryRepository.save(searchHistory);
      }
    }

    return {
      success: true,
      message: 'Search saved successfully',
    };
  }

  async getSearchHistory(userId: number) {
    const history = await this.searchHistoryRepository
      .find({
        where: { userId },
        order: { updatedAt: 'DESC' },
        take: 10,
      });

    return {
      success: true,
      data: history.map(h => h.searchQuery),
    };
  }

  async clearSearchHistory(userId: number) {
    await this.searchHistoryRepository.delete({ userId });
    
    return {
      success: true,
      message: 'Search history cleared successfully',
    };
  }
}
