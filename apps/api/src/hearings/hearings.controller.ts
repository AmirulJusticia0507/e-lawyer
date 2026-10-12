import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Action, Subject } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CreateHearingDto, QueryHearingsDto } from './dto/hearing.dto';
import { HearingsService } from './hearings.service';

@Controller('hearings')
export class HearingsController {
  constructor(private readonly hearings: HearingsService) {}

  @Get()
  @RequirePermission(Action.READ, Subject.HEARING)
  list(@Query() query: QueryHearingsDto) {
    return this.hearings.list(query);
  }

  @Post()
  @RequirePermission(Action.CREATE, Subject.HEARING)
  create(@Body() dto: CreateHearingDto, @CurrentUser('id') actorId: string) {
    return this.hearings.create(dto, actorId);
  }
}
