import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConsultationStatus, Prisma, VideoSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination, toPaginated } from '../common/utils/pagination';
import { assertTransition } from './consultation-status';
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
  constructor(private readonly prisma: PrismaService) {}

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
    const isClosing = dto.status === ConsultationStatus.COMPLETED || dto.status === ConsultationStatus.CANCELLED;
    return this.prisma.consultation.update({
      where: { id },
      data: {
        status: dto.status,
        closedAt: isClosing ? new Date() : undefined,
      },
      include: CONSULTATION_INCLUDE,
    });
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
        status: existing.status === ConsultationStatus.REQUESTED ? ConsultationStatus.SCHEDULED : undefined,
      },
      include: CONSULTATION_INCLUDE,
    });
  }

  async addMessage(id: string, dto: CreateMessageDto, actorId: string) {
    await this.ensureExists(id);
    if (!dto.body && !dto.ciphertext) {
      throw new BadRequestException('Pesan harus memiliki body atau ciphertext');
    }
    return this.prisma.message.create({
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
  }

  async addAttachment(id: string, dto: CreateAttachmentDto, actorId: string) {
    await this.ensureExists(id);
    if (dto.messageId) {
      const message = await this.prisma.message.findFirst({
        where: { id: dto.messageId, consultationId: id },
        select: { id: true },
      });
      if (!message) {
        throw new NotFoundException('Pesan tidak ditemukan pada konsultasi ini');
      }
    }
    return this.prisma.attachment.create({
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
        startedAt: dto.status === VideoSessionStatus.ACTIVE && !session.startedAt ? new Date() : undefined,
        endedAt: dto.status === VideoSessionStatus.ENDED ? new Date() : undefined,
      },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.prisma.consultation.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.consultation.findUnique({ where: { id }, select: { id: true } });
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
