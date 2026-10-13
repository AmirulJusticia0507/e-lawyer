import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { basename, join, resolve } from 'path';
import { ConsultationStatus, Prisma, VideoSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination, toPaginated } from '../common/utils/pagination';
import { IntegrityService } from '../integrity/integrity.service';
import { decryptBufferWithKeys, encryptBuffer } from '../security/encryption';
import { assertTransition } from './consultation-status';
import { ConsultationsGateway } from './consultations.gateway';
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

const USER_SELECT = { id: true, fullName: true, email: true } as const;

const STORAGE_ROOT = resolve(process.cwd(), 'storage');
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const CONSULTATION_INCLUDE = {
  client: { select: { id: true, fullName: true, email: true, phone: true } },
  case: { select: { id: true, caseNumber: true, title: true } },
  requestedBy: { select: USER_SELECT },
  assignedTo: { select: USER_SELECT },
  videoSessions: { orderBy: { createdAt: 'desc' as const } },
  messages: {
    include: {
      sender: { select: { id: true, fullName: true } },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ConsultationsGateway,
    private readonly integrity: IntegrityService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateConsultationDto, actorId: string) {
    await this.ensureClientExists(dto.clientId);
    if (dto.caseId) {
      await this.ensureCaseExists(dto.caseId);
    }
    return this.prisma.consultation.create({
      data: {
        clientId: dto.clientId,
        caseId: dto.caseId,
        requestedById: actorId,
        subject: dto.subject,
        description: dto.description,
        mode: dto.mode,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        status: dto.scheduledAt ? ConsultationStatus.SCHEDULED : ConsultationStatus.REQUESTED,
      },
      include: CONSULTATION_INCLUDE,
    });
  }

  async findAll(query: QueryConsultationDto) {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.ConsultationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.assignedToUserId ? { assignedToUserId: query.assignedToUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { subject: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { client: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        include: {
          client: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return toPaginated(items, total, pagination);
  }

  async findOne(id: string) {
    const existing = await this.prisma.consultation.findUnique({
      where: { id },
      include: CONSULTATION_INCLUDE,
    });
    if (!existing) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
    return existing;
  }

  async update(id: string, dto: UpdateConsultationDto) {
    await this.ensureExists(id);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        subject: dto.subject,
        description: dto.description,
        mode: dto.mode,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
      },
      include: CONSULTATION_INCLUDE,
    });
  }

  async changeStatus(id: string, dto: ChangeConsultationStatusDto) {
    const existing = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
    assertTransition(existing.status, dto.status);
    const isClosing =
      dto.status === ConsultationStatus.COMPLETED || dto.status === ConsultationStatus.CANCELLED;
    const updated = await this.prisma.consultation.update({
      where: { id },
      data: {
        status: dto.status,
        closedAt: isClosing ? new Date() : undefined,
      },
      include: CONSULTATION_INCLUDE,
    });
    this.gateway.notifyStatus(id, updated);
    return updated;
  }

  async assign(id: string, dto: AssignConsultationDto) {
    const existing = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
    const target = await this.prisma.user.findUnique({ where: { id: dto.toUserId } });
    if (!target) {
      throw new NotFoundException('Advokat tujuan tidak ditemukan');
    }
    return this.prisma.consultation.update({
      where: { id },
      data: {
        assignedToUserId: dto.toUserId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        status:
          existing.status === ConsultationStatus.REQUESTED
            ? ConsultationStatus.SCHEDULED
            : undefined,
      },
      include: CONSULTATION_INCLUDE,
    });
  }

  async addMessage(id: string, dto: CreateMessageDto, actorId: string) {
    await this.ensureExists(id);
    if (!dto.body && !dto.ciphertext) {
      throw new BadRequestException('Pesan harus memiliki body atau ciphertext');
    }
    const message = await this.prisma.message.create({
      data: {
        consultationId: id,
        senderId: actorId,
        type: dto.type,
        body: dto.body,
        ciphertext: dto.ciphertext,
        iv: dto.iv,
        algorithm: dto.algorithm,
      },
      include: { sender: { select: { id: true, fullName: true } } },
    });
    this.gateway.notifyMessage(id, message);
    return message;
  }

  async addAttachment(id: string, dto: CreateAttachmentDto, actorId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true, caseId: true },
    });
    if (!consultation) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
    if (dto.messageId) {
      const message = await this.prisma.message.findFirst({
        where: { id: dto.messageId, consultationId: id },
        select: { id: true },
      });
      if (!message) {
        throw new NotFoundException('Pesan tidak ditemukan pada konsultasi ini');
      }
    }
    const attachment = await this.prisma.attachment.create({
      data: {
        consultationId: id,
        messageId: dto.messageId,
        uploaderId: actorId,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        sha256: dto.sha256,
      },
    });
    await this.integrity.registerAttachment({
      attachmentId: attachment.id,
      consultationId: id,
      caseId: consultation.caseId,
      sha256: dto.sha256,
      sizeBytes: dto.sizeBytes,
      storageKey: dto.storageKey,
      uploaderId: actorId,
    });
    return attachment;
  }

  async uploadAttachment(
    id: string,
    file: Express.Multer.File,
    messageId: string | undefined,
    actorId: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true, caseId: true },
    });
    if (!consultation) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
    if (!file) {
      throw new BadRequestException('Berkas wajib diunggah');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas maksimal 20MB');
    }
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const dir = join(STORAGE_ROOT, 'attachments', id);
    mkdirSync(dir, { recursive: true });
    const safeName = basename(file.originalname)
      .replace(/[^\w.\-() ]/g, '_')
      .slice(0, 80);
    const fileName = `${randomUUID()}-${safeName}`;
    writeFileSync(
      join(dir, fileName),
      encryptBuffer(
        file.buffer,
        this.config.get<string>('FILE_ENCRYPTION_KEY') ||
          this.config.getOrThrow<string>('ENCRYPTION_KEY'),
      ),
    );
    const storageKey = join('attachments', id, fileName).split('\\').join('/');

    const attachment = await this.prisma.attachment.create({
      data: {
        consultationId: id,
        messageId,
        uploaderId: actorId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        sha256: hash,
      },
    });

    await this.integrity.registerAttachment({
      attachmentId: attachment.id,
      consultationId: id,
      caseId: consultation.caseId,
      sha256: hash,
      sizeBytes: file.size,
      storageKey,
      uploaderId: actorId,
    });

    return attachment;
  }

  async findAttachment(id: string, attachmentId: string) {
    await this.ensureExists(id);
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, consultationId: id },
    });
    if (!attachment) {
      throw new NotFoundException('Berkas tidak ditemukan');
    }
    return attachment;
  }

  async prepareDownload(id: string, attachmentId: string) {
    const attachment = await this.findAttachment(id, attachmentId);
    const absolute = resolve(STORAGE_ROOT, attachment.storageKey);
    const root = resolve(STORAGE_ROOT);
    if (
      absolute !== root &&
      !absolute.startsWith(root + '\\') &&
      !absolute.startsWith(root + '/')
    ) {
      throw new BadRequestException('Lokasi berkas tidak valid');
    }
    const content = decryptBufferWithKeys(readFileSync(absolute), [
      this.config.get<string>('FILE_ENCRYPTION_KEY') ||
        this.config.getOrThrow<string>('ENCRYPTION_KEY'),
      this.config.get<string>('FILE_ENCRYPTION_KEY_PREVIOUS', ''),
      this.config.get<string>('ENCRYPTION_KEY_PREVIOUS', ''),
    ]);
    return { attachment, content };
  }

  async createVideoSession(id: string, dto: CreateVideoSessionDto) {
    await this.ensureExists(id);
    const roomId = `consult-${id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    return this.prisma.videoSession.create({
      data: {
        consultationId: id,
        roomId,
        provider: dto.provider ?? 'webrtc',
      },
    });
  }

  async updateVideoSessionStatus(id: string, sessionId: string, dto: UpdateVideoSessionStatusDto) {
    await this.ensureExists(id);
    const session = await this.prisma.videoSession.findFirst({
      where: { id: sessionId, consultationId: id },
    });
    if (!session) {
      throw new NotFoundException('Sesi video tidak ditemukan');
    }
    return this.prisma.videoSession.update({
      where: { id: sessionId },
      data: {
        status: dto.status,
        startedAt:
          dto.status === VideoSessionStatus.ACTIVE && !session.startedAt ? new Date() : undefined,
        endedAt: dto.status === VideoSessionStatus.ENDED ? new Date() : undefined,
      },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.integrity.assertDeletable({ consultationId: id });
    await this.prisma.consultation.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
  }

  private async ensureClientExists(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!client) {
      throw new NotFoundException('Klien tidak ditemukan');
    }
  }

  private async ensureCaseExists(id: string): Promise<void> {
    const found = await this.prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
  }
}
