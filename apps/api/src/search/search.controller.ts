// apps/api/src/search/search.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchDto, SearchFiltersDto } from './dto/search.dto';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async search(@Body() searchDto: SearchDto) {
    try {
      // Transform frontend filters to match backend expectations
      const filters: SearchFiltersDto = {};
      
      if (searchDto.filters) {
        // Handle 'all' values from frontend
        if (searchDto.filters.category && searchDto.filters.category !== 'all') {
          filters.category = searchDto.filters.category;
        }
        if (searchDto.filters.type && searchDto.filters.type !== 'all') {
          filters.type = searchDto.filters.type;
        }
        if (searchDto.filters.authorRole && searchDto.filters.authorRole !== 'all') {
          filters.authorRole = searchDto.filters.authorRole;
        }
        if (searchDto.filters.verifiedOnly) {
          filters.verifiedOnly = searchDto.filters.verifiedOnly;
        }
        if (searchDto.filters.sortBy) {
          filters.sortBy = searchDto.filters.sortBy;
        }
      }

      // Use the hybrid search from your service
      const results = await this.searchService.hybridSearch({
        query: searchDto.query,
        limit: searchDto.limit || 20,
        offset: searchDto.offset || 0,
        filters,
      });

      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new HttpException(
        'Search failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('trending')
  async getTrendingSearches() {
    try {
      return await this.searchService.getTrendingSearches();
    } catch (error) {
      console.error('Error fetching trending searches:', error);
      return [];
    }
  }

  @Get('suggestions')
  async getSearchSuggestions(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      return await this.searchService.getSearchSuggestions(query);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  @Post('similar')
  @UseGuards(JwtAuthGuard)
  async findSimilar(@Body() body: { postId: string; limit?: number }) {
    try {
      return await this.searchService.findSimilarContent(
        body.postId,
        body.limit || 5
      );
    } catch (error) {
      console.error('Error finding similar content:', error);
      throw new HttpException(
        'Failed to find similar content',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('advanced')
  @UseGuards(JwtAuthGuard)
  async advancedSearch(@Body() searchDto: SearchDto) {
    try {
      const filters: SearchFiltersDto = {};
      
      if (searchDto.filters) {
        // Handle 'all' values from frontend
        if (searchDto.filters.category && searchDto.filters.category !== 'all') {
          filters.category = searchDto.filters.category;
        }
        if (searchDto.filters.type && searchDto.filters.type !== 'all') {
          filters.type = searchDto.filters.type;
        }
        if (searchDto.filters.authorRole && searchDto.filters.authorRole !== 'all') {
          filters.authorRole = searchDto.filters.authorRole;
        }
        if (searchDto.filters.verifiedOnly) {
          filters.verifiedOnly = searchDto.filters.verifiedOnly;
        }
        if (searchDto.filters.sortBy) {
          filters.sortBy = searchDto.filters.sortBy;
        }
        if (searchDto.filters.dateFrom) {
          filters.dateFrom = searchDto.filters.dateFrom;
        }
        if (searchDto.filters.dateTo) {
          filters.dateTo = searchDto.filters.dateTo;
        }
      }

      return await this.searchService.advancedSearch(searchDto, filters);
    } catch (error) {
      console.error('Advanced search error:', error);
      throw new HttpException(
        'Advanced search failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}