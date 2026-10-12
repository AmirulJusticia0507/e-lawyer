import { Module } from '@nestjs/common';
import { LegalSourcesController } from './legal-sources.controller';
import { LegalSourcesService } from './legal-sources.service';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';
import { LegalSearchController } from './legal-search.controller';
import { LegalSearchService } from './legal-search.service';

@Module({
  controllers: [LegalSourcesController, CitationsController, LegalSearchController],
  providers: [LegalSourcesService, CitationsService, LegalSearchService],
  exports: [LegalSourcesService, CitationsService, LegalSearchService],
})
export class LegalSourcesModule {}