import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  AnomalySeverity,
  AnomalyStatus,
  AnomalyType,
  DeadlineStatus,
  IntegrityCheckResult,
  IntegrityEntityType,
  PartySide,
  Prisma,
  ReceiptStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getPagination, toPaginated } from '../common/utils/pagination';
import { IntegrityGateway } from './integrity.gateway';
import {
  anchorHash,
  anomalyForCheck,
  detectBackdate,
  detectClaimChanged,
  detectDeadlineBreach,
  detectDelayPattern,
  detectReceiptExpiry,
  detectUploadBurst,
  evaluateIntegrity,
  sha256,
  transitionReceipt,
  UPLOAD_BURST_WINDOW_MS,
} from './integrity.rules';
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

const STORAGE_ROOT = resolve(process.cwd(), 'storage');
const SWEEP_INTERVAL_MS = 60_000;

const RECORD_SELECT = {
  id: true,
  entityType: true,
  entityId: true,
  caseId: true,
  consultationId: true,
  sha256: true,
  algorithm: true,
  sizeBytes: true,
  storageKey: true,
  anchorHash: true,
  anchoredAt: true,
  tsaUrl: true,
  createdAt: true,
  recordedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class IntegrityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IntegrityService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: IntegrityGateway,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.sweepTimer = setInterval(() => {
      void this.sweep().catch((error) =>
        this.logger.warn(`Sweep integritas gagal: ${(error as Error).message}`),
      );
    }, SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
  }

  async registerRecord(dto: CreateIntegrityRecordDto, actorId: string) {
    if (dto.caseId) {
      await this.ensureCase(dto.caseId);
    }
    if (dto.consultationId) {
      await this.ensureConsultation(dto.consultationId);
    }
    const claimedAt = dto.claimedAt ? new Date(dto.claimedAt) : null;
    if (claimedAt && detectBackdate(claimedAt, new Date())) {
      await this.flag({
        type: 'BACKDATE_SUSPECT',
        severity: AnomalySeverity.HIGH,
        subject: dto.entityType,
        subjectId: dto.entityId,
        caseId: dto.caseId,
        message: `Tanggal klaim ${claimedAt.toISOString()} jauh sebelum waktu pencatatan`,
        details: { claimedAt: claimedAt.toISOString(), sha256: dto.sha256 },
      });
    }

    const record = await this.prisma.integrityRecord.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        caseId: dto.caseId,
        consultationId: dto.consultationId,
        sha256: dto.sha256.toLowerCase(),
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        recordedById: actorId,
        ...(await this.anchor(dto.sha256)),
      },
      select: RECORD_SELECT,
    });
    return record;
  }

  async registerAttachment(input: {
    attachmentId: string;
    consultationId: string;
    caseId: string | null;
    sha256: string;
    sizeBytes: number;
    storageKey: string;
    uploaderId: string | null;
  }) {
    const record = await this.prisma.integrityRecord.create({
      data: {
        entityType: IntegrityEntityType.ATTACHMENT,
        entityId: input.attachmentId,
        consultationId: input.consultationId,
        caseId: input.caseId,
        sha256: input.sha256.toLowerCase(),
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        recordedById: input.uploaderId,
        ...(await this.anchor(input.sha256)),
      },
      select: RECORD_SELECT,
    });

    const windowStart = new Date(Date.now() - UPLOAD_BURST_WINDOW_MS);
    const recentUploads = await this.prisma.integrityRecord.count({
      where: {
        recordedById: input.uploaderId,
        createdAt: { gte: windowStart },
      },
    });
    if (detectUploadBurst(recentUploads)) {
      await this.flag({
        type: 'UPLOAD_BURST',
        severity: AnomalySeverity.MEDIUM,
        subject: 'ATTACHMENT',
        subjectId: input.uploaderId,
        caseId: input.caseId,
        message: `${recentUploads} berkas diunggah dalam 10 menit terakhir`,
        details: { count: recentUploads, windowMinutes: 10 },
      });
    }
    return record;
  }

  async findRecords(query: {
    page?: number;
    limit?: number;
    caseId?: string;
    consultationId?: string;
    entityType?: IntegrityEntityType;
  }) {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.IntegrityRecordWhereInput = {
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.consultationId ? { consultationId: query.consultationId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.integrityRecord.findMany({
        where,
        select: RECORD_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.integrityRecord.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  async findOneRecord(id: string) {
    const record = await this.prisma.integrityRecord.findUnique({
      where: { id },
      select: {
        ...RECORD_SELECT,
        metadata: true,
        tsaToken: true,
        checks: {
          orderBy: { createdAt: 'desc' },
          include: { checkedBy: { select: { id: true, fullName: true } } },
        },
        addenda: { orderBy: { createdAt: 'asc' } },
        receipts: {
          include: {
            recipientParty: { select: { id: true, name: true, side: true } },
            sender: { select: { id: true, fullName: true } },
          },
        },
        anomalies: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!record) {
      throw new NotFoundException('Record integritas tidak ditemukan');
    }
    return record;
  }

  async verifyRecord(id: string, dto: VerifyIntegrityDto, actorId: string) {
    const record = await this.prisma.integrityRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('Record integritas tidak ditemukan');
    }

    let actualSha256: string | null = null;
    if (record.storageKey) {
      const absolute = resolve(STORAGE_ROOT, record.storageKey);
      const root = resolve(STORAGE_ROOT);
      const inside =
        absolute === root ||
        absolute.startsWith(root + '\\') ||
        absolute.startsWith(root + '/');
      if (inside && existsSync(absolute)) {
        actualSha256 = sha256(readFileSync(absolute));
      }
    }

    const result = evaluateIntegrity(record.sha256, actualSha256);
    const check = await this.prisma.integrityCheck.create({
      data: {
        recordId: record.id,
        expectedSha256: record.sha256,
        actualSha256,
        result,
        note: dto.note,
        checkedById: actorId,
      },
      include: { checkedBy: { select: { id: true, fullName: true } } },
    });

    const anomalyType = anomalyForCheck(result);
    if (anomalyType) {
      await this.flag({
        type: anomalyType,
        severity: AnomalySeverity.HIGH,
        subject: record.entityType,
        subjectId: record.entityId,
        caseId: record.caseId,
        recordId: record.id,
        message:
          result === IntegrityCheckResult.MISSING_FILE
            ? 'Berkas tidak ditemukan saat verifikasi integritas'
            : 'Hash berkas berbeda dari yang tercatat - kemungkinan dimanipulasi',
        details: { expected: record.sha256, actual: actualSha256 },
      });
    }
    return { check, result };
  }

  async createAddendum(caseId: string, dto: CreateAddendumDto, actorId: string) {
    await this.ensureCase(caseId);
    const base = await this.prisma.integrityRecord.findUnique({
      where: { id: dto.recordId },
      select: { id: true, caseId: true },
    });
    if (!base) {
      throw new NotFoundException('Record dasar tidak ditemukan');
    }
    if (base.caseId !== caseId) {
      throw new BadRequestException('Record dasar bukan milik perkara ini');
    }

    const addendumId = randomUUID();
    const contentHash = sha256(dto.content);
    const record = await this.prisma.integrityRecord.create({
      data: {
        entityType: IntegrityEntityType.ADDENDUM,
        entityId: addendumId,
        caseId,
        sha256: contentHash,
        metadata: { title: dto.title, baseRecordId: dto.recordId },
        recordedById: actorId,
        ...(await this.anchor(contentHash)),
      },
      select: RECORD_SELECT,
    });

    return this.prisma.addendum.create({
      data: {
        id: addendumId,
        caseId,
        recordId: record.id,
        authorId: actorId,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  async findAddenda(caseId: string) {
    await this.ensureCase(caseId);
    return this.prisma.addendum.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true } },
        record: { select: RECORD_SELECT },
      },
    });
  }

  async createReceipt(caseId: string, dto: CreateReceiptDto, actorId: string) {
    await this.ensureCase(caseId);
    const record = await this.prisma.integrityRecord.findUnique({
      where: { id: dto.recordId },
      select: { id: true, caseId: true },
    });
    if (!record) {
      throw new NotFoundException('Record tidak ditemukan');
    }
    if (record.caseId !== caseId) {
      throw new BadRequestException('Record bukan milik perkara ini');
    }
    const party = await this.prisma.party.findFirst({
      where: { id: dto.recipientPartyId, caseId },
      select: { id: true },
    });
    if (!party) {
      throw new NotFoundException('Pihak penerima tidak ditemukan pada perkara ini');
    }

    return this.prisma.documentReceipt.create({
      data: {
        caseId,
        recordId: dto.recordId,
        recipientPartyId: dto.recipientPartyId,
        senderId: actorId,
        token: randomBytes(32).toString('hex'),
      },
      include: {
        recipientParty: { select: { id: true, name: true, side: true } },
        record: { select: RECORD_SELECT },
      },
    });
  }

  async findReceipts(caseId: string) {
    await this.ensureCase(caseId);
    return this.prisma.documentReceipt.findMany({
      where: { caseId },
      orderBy: { sentAt: 'desc' },
      include: {
        recipientParty: { select: { id: true, name: true, side: true } },
        sender: { select: { id: true, fullName: true } },
        record: { select: RECORD_SELECT },
      },
    });
  }

  async confirmReceipt(dto: ConfirmReceiptDto) {
    const receipt = await this.prisma.documentReceipt.findUnique({
      where: { id: dto.receiptId },
    });
    if (!receipt) {
      throw new NotFoundException('Resi tidak ditemukan');
    }
    try {
      transitionReceipt(receipt.status, 'confirm');
    } catch (error) {
      throw new ConflictException((error as Error).message);
    }
    return this.prisma.documentReceipt.update({
      where: { id: receipt.id },
      data: {
        status: ReceiptStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmNote: dto.note,
      },
      include: {
        recipientParty: { select: { id: true, name: true, side: true } },
        record: { select: RECORD_SELECT },
      },
    });
  }

  async disputeReceipt(dto: DisputeReceiptDto, actorId: string) {
    const receipt = await this.prisma.documentReceipt.findUnique({
      where: { id: dto.receiptId },
    });
    if (!receipt) {
      throw new NotFoundException('Resi tidak ditemukan');
    }
    try {
      transitionReceipt(receipt.status, 'dispute');
    } catch (error) {
      throw new ConflictException((error as Error).message);
    }
    const updated = await this.prisma.documentReceipt.update({
      where: { id: receipt.id },
      data: { status: ReceiptStatus.DISPUTED, confirmNote: dto.note },
      include: {
        recipientParty: { select: { id: true, name: true, side: true } },
        record: { select: RECORD_SELECT },
      },
    });
    await this.flag({
      type: 'CLAIM_CHANGED',
      severity: AnomalySeverity.HIGH,
      subject: 'DOCUMENT_RECEIPT',
      subjectId: receipt.id,
      caseId: receipt.caseId,
      recordId: receipt.recordId,
      message: `Pihak penerima menyangkal penerimaan dokumen: ${dto.note}`,
      details: { disputedBy: actorId },
    });
    return updated;
  }

  async createDeadline(caseId: string, dto: CreateDeadlineDto) {
    await this.ensureCase(caseId);
    const dueAt = new Date(dto.dueAt);
    if (dueAt.getTime() <= Date.now()) {
      throw new BadRequestException('Tenggat harus di masa depan');
    }
    return this.prisma.caseDeadline.create({
      data: { caseId, label: dto.label, dueAt },
    });
  }

  async findDeadlines(caseId: string) {
    await this.ensureCase(caseId);
    return this.prisma.caseDeadline.findMany({
      where: { caseId },
      orderBy: { dueAt: 'asc' },
    });
  }

  async extendDeadline(id: string, dto: ExtendDeadlineDto) {
    const deadline = await this.prisma.caseDeadline.findUnique({ where: { id } });
    if (!deadline) {
      throw new NotFoundException('Tenggat tidak ditemukan');
    }
    if (deadline.status !== DeadlineStatus.OPEN) {
      throw new ConflictException('Tenggat yang sudah ditutup tidak dapat diundur');
    }
    const dueAt = new Date(dto.dueAt);
    if (dueAt.getTime() <= deadline.dueAt.getTime()) {
      throw new BadRequestException('Tenggat baru harus setelah tenggat lama');
    }

    const updated = await this.prisma.caseDeadline.update({
      where: { id },
      data: {
        dueAt,
        extensionCount: { increment: 1 },
        lastExtensionReason: dto.reason,
        extendedAt: new Date(),
      },
    });

    if (detectDelayPattern(updated.extensionCount)) {
      await this.flag({
        type: 'DELAY_PATTERN',
        severity: AnomalySeverity.MEDIUM,
        subject: 'CASE_DEADLINE',
        subjectId: id,
        caseId: updated.caseId,
        message: `Tenggat "${updated.label}" diundur ${updated.extensionCount} kali`,
        details: {
          extensionCount: updated.extensionCount,
          reason: dto.reason,
        },
      });
    }
    return updated;
  }

  async completeDeadline(id: string, _dto: CompleteDeadlineDto) {
    const deadline = await this.prisma.caseDeadline.findUnique({ where: { id } });
    if (!deadline) {
      throw new NotFoundException('Tenggat tidak ditemukan');
    }
    if (deadline.status !== DeadlineStatus.OPEN) {
      throw new ConflictException('Hanya tenggat berstatus OPEN yang dapat diselesaikan');
    }
    return this.prisma.caseDeadline.update({
      where: { id },
      data: { status: DeadlineStatus.MET },
    });
  }

  async listAnomalies(query: QueryAnomalyDto) {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.AnomalyFlagWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.caseId ? { caseId: query.caseId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.anomalyFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          resolvedBy: { select: { id: true, fullName: true } },
          case: { select: { id: true, caseNumber: true, title: true } },
        },
      }),
      this.prisma.anomalyFlag.count({ where }),
    ]);
    return toPaginated(items, total, pagination);
  }

  async resolveAnomaly(id: string, dto: ResolveAnomalyDto, actorId: string) {
    const anomaly = await this.prisma.anomalyFlag.findUnique({ where: { id } });
    if (!anomaly) {
      throw new NotFoundException('Flag anomali tidak ditemukan');
    }
    if (anomaly.status === AnomalyStatus.RESOLVED) {
      throw new ConflictException('Flag anomali sudah diselesaikan');
    }
    return this.prisma.anomalyFlag.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNote: dto.note,
        resolvedById: dto.status === AnomalyStatus.RESOLVED ? actorId : null,
        resolvedAt: dto.status === AnomalyStatus.RESOLVED ? new Date() : null,
      },
    });
  }

  async caseIntegrity(caseId: string) {
    await this.ensureCase(caseId);
    const [records, addenda, receipts, deadlines, anomalies] = await Promise.all([
      this.prisma.integrityRecord.findMany({
        where: { caseId },
        select: RECORD_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.findAddenda(caseId),
      this.findReceipts(caseId),
      this.prisma.caseDeadline.findMany({
        where: { caseId },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.anomalyFlag.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
        include: { resolvedBy: { select: { id: true, fullName: true } } },
      }),
    ]);

    const latestChecks = await this.prisma.integrityCheck.findMany({
      where: { recordId: { in: records.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' },
      distinct: ['recordId'],
      select: { recordId: true, result: true, createdAt: true },
    });
    const checkByRecord = new Map(latestChecks.map((c) => [c.recordId, c]));

    return {
      records: records.map((record) => ({
        ...record,
        latestCheck: checkByRecord.get(record.id) ?? null,
      })),
      addenda,
      receipts,
      deadlines,
      anomalies,
    };
  }

  async assertDeletable(input: { caseId?: string; consultationId?: string }): Promise<void> {
    const where: Prisma.IntegrityRecordWhereInput = {
      ...(input.caseId ? { caseId: input.caseId } : {}),
      ...(input.consultationId ? { consultationId: input.consultationId } : {}),
    };
    const count = await this.prisma.integrityRecord.count({ where });
    if (count > 0) {
      throw new ConflictException(
        'Tidak dapat menghapus: terdapat record integritas terkait yang bersifat permanen',
      );
    }
  }

  async recordClaimChange(input: {
    caseId: string;
    partyId: string;
    before: { name: string; side: PartySide };
    after: { name: string; side: PartySide };
  }): Promise<void> {
    if (!detectClaimChanged(input.before, input.after)) {
      return;
    }
    await this.flag({
      type: 'CLAIM_CHANGED',
      severity: AnomalySeverity.HIGH,
      subject: 'PARTY',
      subjectId: input.partyId,
      caseId: input.caseId,
      message: `Identitas pihak berubah: "${input.before.name}" (${input.before.side}) menjadi "${input.after.name}" (${input.after.side})`,
      details: { before: input.before, after: input.after },
    });
  }

  async sweep(): Promise<{ breached: number; expired: number }> {
    const now = new Date();

    const overdue = await this.prisma.caseDeadline.findMany({
      where: { status: DeadlineStatus.OPEN },
    });
    let breached = 0;
    for (const deadline of overdue) {
      if (!detectDeadlineBreach(deadline.dueAt, now)) {
        continue;
      }
      await this.prisma.caseDeadline.update({
        where: { id: deadline.id },
        data: { status: DeadlineStatus.BREACHED, breachedAt: now },
      });
      await this.flag({
        type: 'DEADLINE_BREACH',
        severity: AnomalySeverity.HIGH,
        subject: 'CASE_DEADLINE',
        subjectId: deadline.id,
        caseId: deadline.caseId,
        message: `Tenggat "${deadline.label}" terlampaui pada ${deadline.dueAt.toISOString()}`,
        details: { dueAt: deadline.dueAt.toISOString() },
      });
      breached += 1;
    }

    const sent = await this.prisma.documentReceipt.findMany({
      where: { status: ReceiptStatus.SENT },
    });
    let expired = 0;
    for (const receipt of sent) {
      if (!detectReceiptExpiry(receipt.sentAt, now)) {
        continue;
      }
      await this.prisma.documentReceipt.update({
        where: { id: receipt.id },
        data: { status: transitionReceipt(receipt.status, 'expire') },
      });
      expired += 1;
    }

    return { breached, expired };
  }

  private async flag(input: {
    type: AnomalyType;
    severity: AnomalySeverity;
    subject: string;
    message: string;
    subjectId?: string | null;
    caseId?: string | null;
    recordId?: string | null;
    details?: Record<string, unknown>;
  }) {
    const duplicate = await this.prisma.anomalyFlag.findFirst({
      where: {
        type: input.type,
        subject: input.subject,
        subjectId: input.subjectId ?? null,
        caseId: input.caseId ?? null,
        status: { in: [AnomalyStatus.OPEN, AnomalyStatus.ACKNOWLEDGED] },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (duplicate) {
      return duplicate;
    }

    const anomaly = await this.prisma.anomalyFlag.create({
      data: {
        type: input.type,
        severity: input.severity,
        subject: input.subject,
        subjectId: input.subjectId,
        caseId: input.caseId,
        recordId: input.recordId,
        message: input.message,
        details: (input.details as Prisma.InputJsonValue) ?? undefined,
      },
      include: { case: { select: { id: true, caseNumber: true, title: true } } },
    });
    this.gateway.notifyAnomaly(anomaly, input.caseId);
    return anomaly;
  }

  private async anchor(contentHash: string): Promise<{
    anchorHash: string;
    anchoredAt: Date;
    tsaUrl: string | null;
    tsaToken: string | null;
  }> {
    const at = new Date();
    const prev = await this.prisma.integrityRecord.findFirst({
      where: { anchorHash: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { anchorHash: true },
    });
    const chained = anchorHash(prev?.anchorHash ?? null, contentHash, at);

    const tsaUrl = this.config.get<string>('TSA_URL');
    if (!tsaUrl) {
      return { anchorHash: chained, anchoredAt: at, tsaUrl: null, tsaToken: null };
    }

    try {
      const response = await fetch(tsaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: contentHash, algorithm: 'sha256' }),
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const body = (await response.json()) as { token?: string };
        return {
          anchorHash: chained,
          anchoredAt: at,
          tsaUrl,
          tsaToken: body.token ?? null,
        };
      }
      this.logger.warn(`TSA merespons ${response.status}, memakai rantai lokal`);
    } catch (error) {
      this.logger.warn(`TSA gagal, memakai rantai lokal: ${(error as Error).message}`);
    }
    return { anchorHash: chained, anchoredAt: at, tsaUrl: null, tsaToken: null };
  }

  private async ensureCase(id: string): Promise<void> {
    const found = await this.prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!found) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }
  }

  private async ensureConsultation(id: string): Promise<void> {
    const found = await this.prisma.consultation.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Konsultasi tidak ditemukan');
    }
  }
}
