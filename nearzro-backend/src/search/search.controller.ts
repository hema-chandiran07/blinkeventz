import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global dashboard search with fuzzy matching' })
  @ApiQuery({ name: 'q', description: 'Search query string', required: true })
  async search(@Query('q') query: string, @Req() req: any) {
    return this.searchService.globalSearch(query, req.user);
  }
}
