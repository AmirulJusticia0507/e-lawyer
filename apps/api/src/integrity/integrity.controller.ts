import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IntegrityEntityType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { IntegrityService } from './integrity.service';
import {
  CompleteDeadlineDto,
  ConfirmReceiptDto,
  CreateAddendumDto,
  CreateDeadlineDto,
  CreateIntegrityRecordDto,
  CreateReceiptDto,
  DisputeReceiptDto,
  ExtendDeadlineDto,
  QueryAnomalyDto,
  ResolveAnomalyDto,
  VerifyIntegrityDto,
} from './dto/integrity.dto';

@Controller('integrity')
export class IntegrityController {
  constructor(private readonly integrity: IntegrityService) {}

  @Post('records')
  @RequirePermission(Action.CREATE, Subject.INTEGRITY)
  createRecord(@Body() dto: CreateIntegrityRecordDto, @CurrentUser('id') actorId: string) {
    return this.integrity.registerRecord(dto, actorId);
  }

  @Get('records')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  findRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('caseId') caseId?: string,
    @Query('consultationId') consultationId?: string,
    @Query('entityType') entityType?: IntegrityEntityType,
  ) {
    return this.integrity.findRecords({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      caseId,
      consultationId,
      entityType,
    });
  }

  @Get('records/:id')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  findOneRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.integrity.findOneRecord(id);
  }

  @Post('records/:id/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.INTEGRITY)
  verifyRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyIntegrityDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.integrity.verifyRecord(id, dto, actorId);
  }

  @Get('cases/:caseId')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  caseIntegrity(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.integrity.caseIntegrity(caseId);
  }

  @Post('cases/:caseId/addenda')
  @RequirePermission(Action.CREATE, Subject.INTEGRITY)
  createAddendum(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateAddendumDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.integrity.createAddendum(caseId, dto, actorId);
  }

  @Get('cases/:caseId/addenda')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  findAddenda(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.integrity.findAddenda(caseId);
  }

  @Post('cases/:caseId/receipts')
  @RequirePermission(Action.CREATE, Subject.INTEGRITY)
  createReceipt(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateReceiptDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.integrity.createReceipt(caseId, dto, actorId);
  }

  @Get('cases/:caseId/receipts')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  findReceipts(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.integrity.findReceipts(caseId);
  }

  @Post('receipts/confirm')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.INTEGRITY)
  confirmReceipt(@Body() dto: ConfirmReceiptDto) {
    return this.integrity.confirmReceipt(dto);
  }

  @Post('receipts/dispute')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.INTEGRITY)
  disputeReceipt(@Body() dto: DisputeReceiptDto, @CurrentUser('id') actorId: string) {
    return this.integrity.disputeReceipt(dto, actorId);
  }

  @Get('cases/:caseId/deadlines')
  @RequirePermission(Action.READ, Subject.INTEGRITY)
  findDeadlines(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.integrity.findDeadlines(caseId);
  }

  @Post('cases/:caseId/deadlines')
  @RequirePermission(Action.CREATE, Subject.INTEGRITY)
  createDeadline(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateDeadlineDto,
  ) {
    return this.integrity.createDeadline(caseId, dto);
  }

  @Post('deadlines/:id/extend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.INTEGRITY)
  extendDeadline(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ExtendDeadlineDto) {
    return this.integrity.extendDeadline(id, dto);
  }

  @Post('deadlines/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.INTEGRITY)
  completeDeadline(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteDeadlineDto) {
    return this.integrity.completeDeadline(id, dto);
  }

  @Post('sweep')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.UPDATE, Subject.ANOMALY)
  sweep() {
    return this.integrity.sweep();
  }

  @Get('anomalies')
  @RequirePermission(Action.READ, Subject.ANOMALY)
  listAnomalies(@Query() query: QueryAnomalyDto) {
    return this.integrity.listAnomalies(query);
  }

  @Patch('anomalies/:id')
  @RequirePermission(Action.UPDATE, Subject.ANOMALY)
  resolveAnomaly(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAnomalyDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.integrity.resolveAnomaly(id, dto, actorId);
  }
}
