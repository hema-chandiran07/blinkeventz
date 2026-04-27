import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Global search with fuzzy matching (public — role-aware results)' })
  @ApiQuery({ name: 'q', description: 'Search query string', required: true })
  async search(@Query('q') query: string, @Req() req: any) {
    return this.searchService.globalSearch(query, req.user);
  }
}
