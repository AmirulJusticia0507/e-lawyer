import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Action, Subject } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CreateHearingDto, QueryHearingsDto } from './dto/hearing.dto';
import {
  AdvanceStageDto,
  CreatePostponementDto,
  ProcessPostponementDto,
  QuerySlaDto,
} from './dto/sla.dto';
import { HearingsService } from './hearings.service';
import { PostponementService } from './postponement.service';
import { ReminderService } from './reminder.service';
import { SlaService } from './sla.service';

@Controller('hearings')
export class HearingsController {
  constructor(
    private readonly hearings: HearingsService,
    private readonly sla: SlaService,
    private readonly postponement: PostponementService,
    private readonly reminder: ReminderService,
  ) {}

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

  @Get(':id/sla')
  @RequirePermission(Action.READ, Subject.HEARING)
  listSla(@Param('id', ParseUUIDPipe) id: string) {
    return this.sla.listSlaTimers(id);
  }

  @Post(':id/sla/advance')
  @RequirePermission(Action.UPDATE, Subject.HEARING)
  advanceStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdvanceStageDto,
  ) {
    return this.sla.advanceStage(id, dto.stage);
  }

  @Get('sla/statistics')
  @RequirePermission(Action.READ, Subject.HEARING)
  slaStatistics() {
    return this.sla.getStatistics();
  }

  @Get('sla/sweep')
  @RequirePermission(Action.UPDATE, Subject.HEARING)
  slaSweep() {
    return this.sla.sweepSla();
  }

  @Get(':id/postponements')
  @RequirePermission(Action.READ, Subject.HEARING)
  listPostponements(@Param('id', ParseUUIDPipe) id: string) {
    return this.postponement.listPostponements(id);
  }

  @Post(':id/postponements')
  @RequirePermission(Action.CREATE, Subject.HEARING)
  requestPostponement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePostponementDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.postponement.requestPostponement(id, dto, actorId);
  }

  @Patch('postponements/:id')
  @RequirePermission(Action.UPDATE, Subject.HEARING)
  processPostponement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPostponementDto,
    @CurrentUser('id') actorId: string,
  ) {
    if (dto.decision === 'APPROVED') {
      return this.postponement.approvePostponement(id, actorId);
    }
    return this.postponement.rejectPostponement(id, actorId);
  }

  @Get(':id/reminders')
  @RequirePermission(Action.READ, Subject.HEARING)
  listReminders(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminder.listReminders(id);
  }

  @Get('reminders/sweep')
  @RequirePermission(Action.UPDATE, Subject.HEARING)
  reminderSweep() {
    return this.reminder.sweepReminders();
  }
}
