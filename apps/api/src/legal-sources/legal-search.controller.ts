import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { LegalSearchService } from './legal-search.service';
import { SearchLegalSourcesDto, SemanticSearchDto } from './dto/legal-source.dto';

@Controller('legal-sources')
export class LegalSearchController {
  constructor(private readonly search: LegalSearchService) {}

  @Get('search')
  @RequirePermission(Action.READ, Subject.REGULATION)
  find(@Query() query: SearchLegalSourcesDto) {
    return this.search.search(query);
  }

  @Post('search/semantic')
  @RequirePermission(Action.READ, Subject.REGULATION)
  semantic(@Body() dto: SemanticSearchDto) {
    return this.search.semanticSearch(dto);
  }
}