import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { CitationsService } from './citations.service';
import { CreateCitationDto } from './dto/citation.dto';

@Controller()
export class CitationsController {
  constructor(private readonly citations: CitationsService) {}

  @Get('cases/:caseId/citations')
  @RequirePermission(Action.READ, Subject.CITATION)
  findByCase(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.citations.findByCase(caseId);
  }

  @Post('cases/:caseId/citations')
  @RequirePermission(Action.CREATE, Subject.CITATION)
  create(@Param('caseId', ParseUUIDPipe) caseId: string, @Body() dto: CreateCitationDto) {
    return this.citations.create(caseId, dto);
  }

  @Get('cases/:caseId/legal-basis')
  @RequirePermission(Action.READ, Subject.CITATION)
  legalBasis(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.citations.legalBasis(caseId);
  }

  @Post('cases/:caseId/citations/revalidate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.CITATION)
  revalidate(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.citations.revalidateCase(caseId);
  }

  @Delete('cases/:caseId/citations/:citationId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.DELETE, Subject.CITATION)
  remove(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('citationId', ParseUUIDPipe) citationId: string,
  ) {
    return this.citations.remove(caseId, citationId);
  }

  @Get('articles/:articleId/cross-reference')
  @RequirePermission(Action.READ, Subject.REGULATION)
  crossReference(@Param('articleId', ParseUUIDPipe) articleId: string) {
    return this.citations.crossReference(articleId);
  }
}