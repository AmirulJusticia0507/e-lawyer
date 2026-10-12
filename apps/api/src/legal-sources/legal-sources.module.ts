import { Module } from '@nestjs/common';
import { LegalSourcesController } from './legal-sources.controller';
import { LegalSourcesService } from './legal-sources.service';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';

@Module({
  controllers: [LegalSourcesController, CitationsController],
  providers: [LegalSourcesService, CitationsService],
  exports: [LegalSourcesService, CitationsService],
})
export class LegalSourcesModule {}