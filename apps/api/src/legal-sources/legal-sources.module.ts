import { Module } from '@nestjs/common';
import { LegalSourcesController } from './legal-sources.controller';
import { LegalSourcesService } from './legal-sources.service';

@Module({
  controllers: [LegalSourcesController],
  providers: [LegalSourcesService],
  exports: [LegalSourcesService],
})
export class LegalSourcesModule {}