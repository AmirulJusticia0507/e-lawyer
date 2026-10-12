import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AiDraftService } from './ai-draft.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, AiDraftService],
})
export class DocumentsModule {}
