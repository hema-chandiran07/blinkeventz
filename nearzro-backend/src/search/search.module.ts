import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchAuditProcessor } from './processors/search-audit.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'search-audit',
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchAuditProcessor],
  exports: [SearchService],
})
export class SearchModule {}
