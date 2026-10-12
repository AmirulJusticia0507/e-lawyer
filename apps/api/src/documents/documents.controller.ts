import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject, key } from '../common/constants/permissions';
import { DocumentType } from '@prisma/client';
import {
  CreateDocumentDto,
  CreatePowerOfAttorneyDto,
  CreateSignatureDto,
  CreateTemplateDto,
  JudgmentInputDto,
  QueryDocumentsDto,
  UpdateDocumentDto,
} from './dto/document.dto';
import { DocumentsService } from './documents.service';

@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('documents/templates')
  @RequirePermission(Action.READ, Subject.DOCUMENT)
  templates(@Query('type') type?: CreateDocumentDto['type']) {
    return this.documents.listTemplates(type);
  }

  @Delete('documents/templates/:id')
  @RequirePermission(Action.DELETE, Subject.DOCUMENT)
  archiveTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.archiveTemplate(id);
  }

  @Post('documents/templates')
  @RequirePermission(Action.CREATE, Subject.DOCUMENT)
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser('id') actorId: string) {
    return this.documents.createTemplate(dto, actorId);
  }

  @Post('documents/templates/:id/versions')
  @RequirePermission(Action.CREATE, Subject.DOCUMENT)
  createTemplateVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.documents.createTemplateVersion(id, dto, actorId);
  }

  @Get('documents')
  @RequirePermission(Action.READ, Subject.DOCUMENT)
  list(@Query() query: QueryDocumentsDto) {
    return this.documents.list(query);
  }

  @Post('documents')
  @RequirePermission(Action.CREATE, Subject.DOCUMENT)
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser('id') actorId: string,
    @CurrentUser('permissions') permissions: string[],
  ) {
    if (
      dto.type === DocumentType.JUDGMENT &&
      !permissions.includes(key(Action.CREATE, Subject.JUDGMENT))
    ) {
      throw new ForbiddenException('Hanya pengguna dengan izin penyusun putusan yang dapat membuat putusan');
    }
    return this.documents.create(dto, actorId);
  }

  @Get('documents/:id')
  @RequirePermission(Action.READ, Subject.DOCUMENT)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.get(id);
  }

  @Patch('documents/:id')
  @RequirePermission(Action.UPDATE, Subject.DOCUMENT)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.documents.update(id, dto, actorId);
  }

  @Post('documents/:id/submit')
  @RequirePermission(Action.UPDATE, Subject.DOCUMENT)
  submit(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.submit(id);
  }

  @Post('documents/:id/signatures')
  @RequirePermission(Action.CREATE, Subject.DOCUMENT)
  createSignature(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSignatureDto) {
    return this.documents.createSignature(id, dto);
  }

  @Post('documents/:id/power-of-attorney')
  @RequirePermission(Action.UPDATE, Subject.DOCUMENT)
  createPowerOfAttorney(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePowerOfAttorneyDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.documents.createPowerOfAttorney(id, dto, actorId);
  }

  @Post('documents/:id/judgment')
  @RequirePermission(Action.CREATE, Subject.JUDGMENT)
  createJudgment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: JudgmentInputDto) {
    return this.documents.createJudgment(id, dto);
  }
}
