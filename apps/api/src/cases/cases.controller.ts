import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { CasesService } from './cases.service';
import {
  AssignCaseDto,
  ChangeStatusDto,
  CreateCaseDto,
  QueryCaseDto,
  UpdateCaseDto,
} from './dto/case.dto';
import { CreateInteractionDto } from './dto/interaction.dto';
import { CreatePartyDto, UpdatePartyDto } from './dto/party.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Post()
  @RequirePermission(Action.CREATE, Subject.CASE)
  create(@Body() dto: CreateCaseDto, @CurrentUser('id') actorId: string) {
    return this.cases.create(dto, actorId);
  }

  @Get()
  @RequirePermission(Action.READ, Subject.CASE)
  findAll(@Query() query: QueryCaseDto) {
    return this.cases.findAll(query);
  }

  @Get(':id')
  @RequirePermission(Action.READ, Subject.CASE)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cases.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(Action.UPDATE, Subject.CASE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCaseDto) {
    return this.cases.update(id, dto);
  }

  @Post(':id/status')
  @RequirePermission(Action.UPDATE, Subject.CASE)
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeStatusDto) {
    return this.cases.changeStatus(id, dto);
  }

  @Post(':id/assign')
  @RequirePermission(Action.UPDATE, Subject.CASE)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCaseDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.cases.assignCase(id, dto, actorId);
  }

  @Post(':id/parties')
  @RequirePermission(Action.CREATE, Subject.CASE)
  addParty(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePartyDto) {
    return this.cases.addParty(id, dto);
  }

  @Patch(':id/parties/:partyId')
  @RequirePermission(Action.UPDATE, Subject.CASE)
  updateParty(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partyId', ParseUUIDPipe) partyId: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.cases.updateParty(id, partyId, dto);
  }

  @Delete(':id/parties/:partyId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.DELETE, Subject.CASE)
  removeParty(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partyId', ParseUUIDPipe) partyId: string,
  ) {
    return this.cases.removeParty(id, partyId);
  }

  @Post(':id/interactions')
  @RequirePermission(Action.CREATE, Subject.CASE)
  addInteraction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInteractionDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.cases.addInteraction(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.DELETE, Subject.CASE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cases.remove(id);
  }
}