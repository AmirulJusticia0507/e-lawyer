import { Controller, Get, Param, Query } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { LegalSourcesService } from './legal-sources.service';
import {
  LookupArticleDto,
  QueryArticleDto,
  QueryArticleInRegulationDto,
  QueryRegulationDto,
} from './dto/legal-source.dto';

@Controller()
export class LegalSourcesController {
  constructor(private readonly legalSources: LegalSourcesService) {}

  @Get('regulations')
  @RequirePermission(Action.READ, Subject.REGULATION)
  findRegulations(@Query() query: QueryRegulationDto) {
    return this.legalSources.findRegulations(query);
  }

  @Get('regulations/:slug')
  @RequirePermission(Action.READ, Subject.REGULATION)
  findRegulation(@Param('slug') slug: string, @Query('at') at?: string) {
    return this.legalSources.findRegulationBySlug(slug, at);
  }

  @Get('regulations/:slug/articles')
  @RequirePermission(Action.READ, Subject.REGULATION)
  findArticlesInRegulation(
    @Param('slug') slug: string,
    @Query() query: QueryArticleInRegulationDto,
  ) {
    return this.legalSources.findArticlesInRegulation(slug, query);
  }

  @Get('articles')
  @RequirePermission(Action.READ, Subject.REGULATION)
  findArticles(@Query() query: QueryArticleDto) {
    return this.legalSources.findArticles(query);
  }

  @Get('articles/lookup')
  @RequirePermission(Action.READ, Subject.REGULATION)
  lookupArticle(@Query() query: LookupArticleDto) {
    return this.legalSources.lookupArticle(query);
  }

  @Get('articles/:id')
  @RequirePermission(Action.READ, Subject.REGULATION)
  findArticle(@Param('id') id: string, @Query('at') at?: string) {
    return this.legalSources.findArticleById(id, at);
  }
}