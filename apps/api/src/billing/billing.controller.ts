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
  CreatePaymentDto,
  ProcessPaymentDto,
  CreateInvoiceDto,
} from './dto/billing.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('time-entries')
  @RequirePermission(Action.READ, Subject.INVOICE)
  listTimeEntries(@Query() query: QueryTimeEntryDto) {
    const caseId = (query.caseId as string) || '';
    const userId = (query.userId as string) || '';
    return this.billing.listTimeEntries(caseId, userId);
  }

  @Post('time-entries/start')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  startTimer(@Body() dto: StartTimerDto, @CurrentUser('id') userId: string) {
    return this.billing.startTimer(
      dto.caseId || '',
      userId,
      dto.description || '',
      dto.billable ?? true,
      dto.hourlyRate || 0,
    );
  }

  @Patch('time-entries/:id/stop')
  @RequirePermission(Action.UPDATE, Subject.INVOICE)
  stopTimer(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.billing.stopTimer(id, userId);
  }

  @Post('time-entries/manual')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createManual(@Body() dto: CreateManualTimeEntryDto, @CurrentUser('id') userId: string) {
    return this.billing.createManualTimeEntry(
      dto.caseId || '',
      userId,
      dto.startedAt || '',
      dto.endedAt || '',
      dto.description || '',
      dto.billable ?? true,
      dto.hourlyRate || 0,
    );
  }

  @Get('fee-schemes')
  @RequirePermission(Action.READ, Subject.INVOICE)
  listFeeSchemes(@Query() query: QueryFeeSchemeDto) {
    return this.billing.listFeeSchemes(
      (query.caseId as string) || '',
      (query.clientId as string) || '',
      (query.type as string) || '',
    );
  }

  @Post('fee-schemes')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createFeeScheme(@Body() dto: CreateFeeSchemeDto) {
    const successPct = dto.successPercentage;
    return this.billing.createFeeScheme(
      dto.caseId || '',
      dto.clientId || '',
      dto.type || '',
      dto.name || '',
      dto.amount ?? 0,
      dto.hourlyRate ?? 0,
      dto.currency || 'IDR',
      successPct as any,
    );
  }

  @Patch('fee-schemes/:id/deactivate')
  @RequirePermission(Action.UPDATE, Subject.INVOICE)
  deactivateFeeScheme(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.deactivateFeeScheme(id);
  }

  // Payment Gateway endpoints

  @Post('payments')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser('id') actorId: string) {
    return this.billing.createPayment(
      dto.invoiceId || '',
      dto.method || 'VA',
      dto.amount || 0,
      dto.reference || '',
      actorId,
    );
  }

  @Patch('payments/:reference/process')
  @RequirePermission(Action.UPDATE, Subject.INVOICE)
  processPayment(@Param('reference') reference: string, @Body() dto: ProcessPaymentDto, @CurrentUser('id') actorId: string) {
    return this.billing.processPayment(reference, dto.paidAt || new Date().toISOString(), actorId);
  }

  // Invoice Generator endpoint

  @Post('invoices')
  @RequirePermission(Action.CREATE, Subject.INVOICE)
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billing.createInvoice(
      dto.caseId || '',
      dto.clientId || '',
      dto.items || [],
      dto.subtotal ?? 0,
      dto.taxRate ?? 10,
    );
  }
}