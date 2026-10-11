import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { extname } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Action, Subject } from '../common/constants/permissions';
import { ConsultationsService } from './consultations.service';
import {
  AssignConsultationDto,
  ChangeConsultationStatusDto,
  CreateConsultationDto,
  QueryConsultationDto,
  UpdateConsultationDto,
} from './dto/consultation.dto';
import {
  CreateAttachmentDto,
  CreateMessageDto,
  CreateVideoSessionDto,
  UpdateVideoSessionStatusDto,
} from './dto/message.dto';

@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}

  @Post()
  @RequirePermission(Action.CREATE, Subject.CONSULTATION)
  create(@Body() dto: CreateConsultationDto, @CurrentUser('id') actorId: string) {
    return this.consultations.create(dto, actorId);
  }

  @Get()
  @RequirePermission(Action.READ, Subject.CONSULTATION)
  findAll(@Query() query: QueryConsultationDto) {
    return this.consultations.findAll(query);
  }

  @Get(':id')
  @RequirePermission(Action.READ, Subject.CONSULTATION)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultations.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConsultationDto) {
    return this.consultations.update(id, dto);
  }

  @Post(':id/status')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeConsultationStatusDto) {
    return this.consultations.changeStatus(id, dto);
  }

  @Post(':id/assign')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignConsultationDto) {
    return this.consultations.assign(id, dto);
  }

  @Post(':id/messages')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.consultations.addMessage(id, dto, actorId);
  }

  @Post(':id/attachments')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAttachmentDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.consultations.addAttachment(id, dto, actorId);
  }

  @Post(':id/attachments/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  uploadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('messageId') messageId: string | undefined,
    @CurrentUser('id') actorId: string,
  ) {
    return this.consultations.uploadAttachment(id, file, messageId, actorId);
  }

  @Get(':id/attachments/:attachmentId/download')
  @Header('Cache-Control', 'private, max-age=60')
  @RequirePermission(Action.READ, Subject.CONSULTATION)
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { attachment, absolute } = await this.consultations.prepareDownload(id, attachmentId);
    const fallback = extname(attachment.fileName) || '.bin';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="download${fallback}"`,
    );
    return new StreamableFile(createReadStream(absolute), {
      type: attachment.mimeType,
      disposition: `attachment; filename="download${fallback}"`,
    });
  }

  @Post(':id/video-sessions')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  createVideoSession(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateVideoSessionDto) {
    return this.consultations.createVideoSession(id, dto);
  }

  @Patch(':id/video-sessions/:sessionId')
  @RequirePermission(Action.UPDATE, Subject.CONSULTATION)
  updateVideoSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateVideoSessionStatusDto,
  ) {
    return this.consultations.updateVideoSessionStatus(id, sessionId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Action.DELETE, Subject.CONSULTATION)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.consultations.remove(id);
  }
}
