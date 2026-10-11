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
import { ClientsService } from './clients.service';
import { CreateClientDto, QueryClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @RequirePermission(Action.CREATE, Subject.CLIENT)
  create(@Body() dto: CreateClientDto, @CurrentUser('id') actorId: string) {
    return this.clients.create(dto, actorId);
  }

  @Get()
  @RequirePermission(Action.READ, Subject.CLIENT)
  findAll(@Query() query: QueryClientDto) {
    return this.clients.findAll(query);
  }

  @Get(':id')
  @RequirePermission(Action.READ, Subject.CLIENT)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(Action.UPDATE, Subject.CLIENT)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.DELETE, Subject.CLIENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.remove(id);
  }
}