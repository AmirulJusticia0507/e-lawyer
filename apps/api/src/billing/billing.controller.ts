import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Action, Subject } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { BillingService } from './billing.service';
import {
  CreateFeeSchemeDto,
  CreateManualTimeEntryDto,
  QueryFeeSchemeDto,
  QueryTimeEntryDto,
  StartTimerDto,
} from './dto/billing.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('time-entries')
  @RequirePermission(Action.READ, Subject.INVOICE)
  listTimeEntries(@Query() query: QueryTimeEntryDto) {
    return this.billing.listTimeEntries(query);
  }

  @Post('time-entries/start')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  startTimer(@Body() dto: StartTimerDto, @CurrentUser('id') userId: string) {
    return this.billing.startTimer(dto, userId);
  }

  @Patch('time-entries/:id/stop')
  @RequirePermission(Action.UPDATE, Subject.INVOICE)
  stopTimer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.billing.stopTimer(id, userId);
  }

  @Post('time-entries/manual')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createManual(@Body() dto: CreateManualTimeEntryDto, @CurrentUser('id') userId: string) {
    return this.billing.createManualTimeEntry(dto, userId);
  }

  @Get('fee-schemes')
  @RequirePermission(Action.READ, Subject.INVOICE)
  listFeeSchemes(@Query() query: QueryFeeSchemeDto) {
    return this.billing.listFeeSchemes(query);
  }

  @Post('fee-schemes')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createFeeScheme(@Body() dto: CreateFeeSchemeDto) {
    return this.billing.createFeeScheme(dto);
  }

  @Patch('fee-schemes/:id/deactivate')
  @RequirePermission(Action.UPDATE, Subject.INVOICE)
  deactivateFeeScheme(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.deactivateFeeScheme(id);
  }
}
