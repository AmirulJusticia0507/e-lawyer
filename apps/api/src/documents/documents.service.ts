import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CitationDocumentType,
  CitationValidationStatus,
  DocumentStatus,
  DocumentType,
  PowerOfAttorneyType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { decryptTextWithKeys, encryptText } from '../security/encryption';
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  hashDocumentContent,
  renderDocumentTemplate,
} from './document-content';
import {
  CreateDocumentDto,
  CreatePowerOfAttorneyDto,
  CreateSignatureDto,
  CreateTemplateDto,
  JudgmentInputDto,
  QueryDocumentsDto,
  UpdateDocumentDto,
} from './dto/document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private encrypt(content: string): string {
    return encryptText(content, this.documentKey());
  }

  private decrypt(content: string): string {
    return decryptTextWithKeys(content, [
      this.documentKey(),
      this.config.get<string>('DOCUMENT_ENCRYPTION_KEY_PREVIOUS', ''),
      this.config.get<string>('ENCRYPTION_KEY_PREVIOUS', ''),
    ]);
  }

  private documentKey(): string {
    return (
      this.config.get<string>('DOCUMENT_ENCRYPTION_KEY') ||
      this.config.getOrThrow<string>('ENCRYPTION_KEY')
    );
  }

  async list(query: QueryDocumentsDto) {
    const where: Prisma.DocumentWhereInput = {
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          case: { select: { id: true, caseNumber: true, title: true, jurisdiction: true } },
          template: { select: { id: true, name: true, version: true } },
          _count: { select: { versions: true, signatures: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.document.count({ where }),
    ]);
    return {
      items: items.map((item) => ({ ...item, content: this.decrypt(item.content) })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async archiveTemplate(id: string): Promise<{ success: true }> {
    const result = await this.prisma.template.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });
    if (result.count === 0) throw new NotFoundException('Template aktif tidak ditemukan');
    return { success: true };
  }

  async get(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            courtName: true,
            jurisdiction: true,
            parties: { select: { name: true, side: true, nik: true, npwp: true } },
          },
        },
        template: { select: { id: true, name: true, version: true } },
        versions: { orderBy: { version: 'desc' } },
        signatures: { orderBy: { createdAt: 'desc' } },
        powerOfAttorney: true,
        judgment: true,
      },
    });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');
    return {
      ...document,
      content: this.decrypt(document.content),
      versions: document.versions.map((version) => ({
        ...version,
        content: this.decrypt(version.content),
      })),
    };
  }

  async listTemplates(documentType?: DocumentType) {
    const templates = await this.prisma.template.findMany({
      where: { isActive: true, ...(documentType ? { documentType } : {}) },
      orderBy: [{ documentType: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });
    return templates;
  }

  async createTemplate(dto: CreateTemplateDto, actorId: string) {
    return this.prisma.template.create({
      data: {
        ...dto,
        content: dto.content ?? DEFAULT_DOCUMENT_TEMPLATES[dto.documentType],
        structure: dto.structure as Prisma.InputJsonValue | undefined,
        createdById: actorId,
      },
    });
  }

  async createTemplateVersion(id: string, dto: CreateTemplateDto, actorId: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');
    if (!template.isActive)
      throw new ConflictException('Template arsip tidak dapat dibuat versinya');
    if (
      dto.name !== template.name ||
      dto.documentType !== template.documentType ||
      dto.jurisdiction !== template.jurisdiction
    ) {
      throw new BadRequestException(
        'Versi baru harus mempertahankan nama, jenis dokumen, dan lingkungan peradilan',
      );
    }
    const latestVersion = await this.prisma.template.aggregate({
      where: {
        name: template.name,
        documentType: template.documentType,
        jurisdiction: template.jurisdiction,
      },
      _max: { version: true },
    });
    return this.prisma.$transaction(async (tx) => {
      await tx.template.update({ where: { id }, data: { isActive: false } });
      return tx.template.create({
        data: {
          name: dto.name,
          documentType: dto.documentType,
          jurisdiction: dto.jurisdiction,
          version: (latestVersion._max.version ?? template.version) + 1,
          content: dto.content ?? template.content,
          structure: dto.structure
            ? (dto.structure as Prisma.InputJsonValue)
            : (template.structure as Prisma.InputJsonValue | undefined),
          createdById: actorId,
        },
      });
    });
  }

  async create(dto: CreateDocumentDto, actorId: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: dto.caseId },
      include: { parties: true },
    });
    if (!caseRecord) throw new NotFoundException('Perkara tidak ditemukan');

    const template = dto.templateId
      ? await this.prisma.template.findUnique({ where: { id: dto.templateId } })
      : null;
    if (dto.templateId && !template) throw new NotFoundException('Template tidak ditemukan');
    if (template && !template.isActive) throw new BadRequestException('Template sudah diarsipkan');
    if (template && template.documentType !== dto.type) {
      throw new BadRequestException('Jenis template tidak sesuai dengan jenis dokumen');
    }
    if (template && template.jurisdiction !== caseRecord.jurisdiction) {
      throw new BadRequestException('Lingkungan peradilan template tidak sesuai perkara');
    }

    const data = dto.data ?? {};
    let content = dto.content ?? template?.content ?? DEFAULT_DOCUMENT_TEMPLATES[dto.type];
    const templateValues: Record<string, string> = {
      NOMOR_PERKARA: caseRecord.caseNumber,
      JUDUL_PERKARA: caseRecord.title,
      PENGADILAN: caseRecord.courtName ?? '[Nama pengadilan]',
      PARA_PIHAK: caseRecord.parties.map((party) => `${party.side}: ${party.name}`).join('\\n'),
      TANGGAL: new Date().toLocaleDateString('id-ID'),
      ...(Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key.toUpperCase(), String(value)]),
      ) as Record<string, string>),
    };

    if (dto.powerOfAttorney) {
      if (dto.type !== DocumentType.POWER_OF_ATTORNEY) {
        throw new BadRequestException('Data surat kuasa hanya untuk dokumen Surat Kuasa');
      }
      this.validatePowerOfAttorney(dto.powerOfAttorney);
      if (dto.powerOfAttorney.clientId) {
        const party = caseRecord.parties.find(
          (item) => item.clientId === dto.powerOfAttorney?.clientId,
        );
        if (!party) {
          throw new BadRequestException(
            'Klien pemberi kuasa harus terdaftar sebagai pihak dalam perkara',
          );
        }
      }
      templateValues.NAMA_PEMBERI = dto.powerOfAttorney.principalName;
      templateValues.NIK_PEMBERI = dto.powerOfAttorney.principalNik ?? '[NIK]';
      templateValues.NAMA_PENERIMA = dto.powerOfAttorney.attorneyName;
      templateValues.NOMOR_IZIN = dto.powerOfAttorney.attorneyLicenseNo;
      templateValues.JENIS_KUASA = dto.powerOfAttorney.type;
      templateValues.KEWENANGAN = JSON.stringify(dto.powerOfAttorney.authority ?? {});
    }
    if (dto.judgment) {
      if (dto.type !== DocumentType.JUDGMENT) {
        throw new BadRequestException('Data putusan hanya untuk dokumen Putusan');
      }
      await this.validateJudgmentCitations(dto.caseId, dto.judgment.considerations);
      Object.assign(templateValues, {
        KEPALA: JSON.stringify(dto.judgment.header ?? {}),
        IDENTITAS: JSON.stringify(dto.judgment.partyIdentities ?? {}),
        DUDUK_PERKARA: dto.judgment.caseSummary,
        PERTIMBANGAN: dto.judgment.considerations,
        AMAR: dto.judgment.disposition,
        PENUTUP: dto.judgment.closing,
      });
    }
    content = renderDocumentTemplate(content, templateValues);

    const hash = hashDocumentContent(content);
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          caseId: dto.caseId,
          templateId: template?.id,
          createdById: actorId,
          type: dto.type,
          title: dto.title,
          content: this.encrypt(content),
          sha256: hash,
          data: dto.data as Prisma.InputJsonValue | undefined,
          versions: {
            create: {
              version: 1,
              content: this.encrypt(content),
              data: dto.data as Prisma.InputJsonValue | undefined,
              createdById: actorId,
              changeSummary: 'Versi awal',
            },
          },
          ...(dto.powerOfAttorney
            ? {
                powerOfAttorney: {
                  create: {
                    type: dto.powerOfAttorney.type,
                    clientId: dto.powerOfAttorney.clientId,
                    principalName: dto.powerOfAttorney.principalName,
                    principalNik: dto.powerOfAttorney.principalNik,
                    principalNpwp: dto.powerOfAttorney.principalNpwp,
                    attorneyName: dto.powerOfAttorney.attorneyName,
                    attorneyLicenseNo: dto.powerOfAttorney.attorneyLicenseNo,
                    attorneyNpwp: dto.powerOfAttorney.attorneyNpwp,
                    authority: dto.powerOfAttorney.authority as Prisma.InputJsonValue | undefined,
                    validFrom: dto.powerOfAttorney.validFrom
                      ? new Date(dto.powerOfAttorney.validFrom)
                      : undefined,
                    validUntil: dto.powerOfAttorney.validUntil
                      ? new Date(dto.powerOfAttorney.validUntil)
                      : undefined,
                    attorneyUserId: actorId,
                  },
                },
              }
            : {}),
          ...(dto.judgment
            ? {
                judgment: {
                  create: {
                    verdict: dto.judgment.verdict,
                    header: dto.judgment.header as Prisma.InputJsonValue | undefined,
                    partyIdentities: dto.judgment.partyIdentities as
                      Prisma.InputJsonValue | undefined,
                    caseSummary: dto.judgment.caseSummary,
                    considerations: dto.judgment.considerations,
                    disposition: dto.judgment.disposition,
                    closing: dto.judgment.closing,
                  },
                },
              }
            : {}),
        },
        include: { versions: true, powerOfAttorney: true, judgment: true },
      });
      return {
        ...document,
        content,
        versions: document.versions.map((version) => ({ ...version, content })),
      };
    });
  }

  async update(id: string, dto: UpdateDocumentDto, actorId: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Dokumen tidak ditemukan');
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new ConflictException(
        'Dokumen terkirim tidak dapat diubah; buat addendum atau versi baru',
      );
    }
    const content = dto.content ?? this.decrypt(existing.content);
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.documentVersion.aggregate({
        where: { documentId: id },
        _max: { version: true },
      });
      const document = await tx.document.update({
        where: { id },
        data: {
          title: dto.title,
          content: this.encrypt(content),
          sha256: hashDocumentContent(content),
          data: dto.data as Prisma.InputJsonValue | undefined,
          versions: {
            create: {
              version: (version._max.version ?? 0) + 1,
              content: this.encrypt(content),
              data: dto.data as Prisma.InputJsonValue | undefined,
              createdById: actorId,
              changeSummary: dto.changeSummary ?? 'Perubahan draf',
            },
          },
        },
      });
      return { ...document, content };
    });
  }

  async submit(id: string) {
    const existing = await this.prisma.document.findUnique({
      where: { id },
      include: { judgment: true },
    });
    if (!existing) throw new NotFoundException('Dokumen tidak ditemukan');
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new ConflictException('Hanya dokumen draf yang dapat dikirim');
    }
    if (existing.type === DocumentType.JUDGMENT && !existing.judgment) {
      throw new BadRequestException('Lengkapi struktur putusan terlebih dahulu');
    }
    if (existing.type === DocumentType.JUDGMENT && existing.judgment) {
      await this.validateJudgmentCitations(existing.caseId, existing.judgment.considerations);
    }
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.SUBMITTED,
        submittedAt: new Date(),
        sha256: existing.sha256 ?? hashDocumentContent(this.decrypt(existing.content)),
      },
    });
    return { ...document, content: this.decrypt(document.content) };
  }

  async createSignature(id: string, dto: CreateSignatureDto) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');
    if (document.status !== DocumentStatus.SUBMITTED) {
      throw new ConflictException(
        'Tanda tangan hanya dapat diminta untuk dokumen yang sudah dikirim',
      );
    }
    return this.prisma.signature.create({
      data: {
        documentId: id,
        signerName: dto.signerName,
        signerRole: dto.signerRole,
        metadata: {
          ...(dto.signerEmail ? { signerEmail: dto.signerEmail } : {}),
          providerStatus: 'NOT_CONFIGURED',
        },
      },
    });
  }

  async createPowerOfAttorney(documentId: string, dto: CreatePowerOfAttorneyDto, actorId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { powerOfAttorney: { select: { id: true } } },
    });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');
    if (document.type !== DocumentType.POWER_OF_ATTORNEY) {
      throw new BadRequestException('Dokumen bukan Surat Kuasa');
    }
    if (document.status !== DocumentStatus.DRAFT) {
      throw new ConflictException('Data Surat Kuasa pada dokumen terkirim tidak dapat diubah');
    }
    if (document.powerOfAttorney) {
      throw new ConflictException('Data Surat Kuasa sudah ada pada dokumen ini');
    }
    this.validatePowerOfAttorney(dto);
    return this.prisma.powerOfAttorney.create({
      data: {
        documentId,
        ...dto,
        authority: dto.authority as Prisma.InputJsonValue | undefined,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        attorneyUserId: actorId,
      },
    });
  }

  async createJudgment(documentId: string, dto: JudgmentInputDto) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan');
    if (document.type !== DocumentType.JUDGMENT)
      throw new BadRequestException('Dokumen bukan Putusan');
    if (document.status !== DocumentStatus.DRAFT)
      throw new ConflictException('Putusan terkirim tidak dapat diubah');
    await this.validateJudgmentCitations(document.caseId, dto.considerations);
    return this.prisma.judgment.upsert({
      where: { documentId },
      create: {
        documentId,
        verdict: dto.verdict,
        header: dto.header as Prisma.InputJsonValue | undefined,
        partyIdentities: dto.partyIdentities as Prisma.InputJsonValue | undefined,
        caseSummary: dto.caseSummary,
        considerations: dto.considerations,
        disposition: dto.disposition,
        closing: dto.closing,
      },
      update: {
        verdict: dto.verdict,
        header: dto.header as Prisma.InputJsonValue | undefined,
        partyIdentities: dto.partyIdentities as Prisma.InputJsonValue | undefined,
        caseSummary: dto.caseSummary,
        considerations: dto.considerations,
        disposition: dto.disposition,
        closing: dto.closing,
      },
    });
  }

  private validatePowerOfAttorney(dto: CreatePowerOfAttorneyDto): void {
    if (dto.type === PowerOfAttorneyType.SPECIAL && !dto.authority) {
      throw new BadRequestException('Surat kuasa istimewa wajib memuat rincian kewenangan khusus');
    }
    if (dto.validFrom && dto.validUntil && new Date(dto.validUntil) < new Date(dto.validFrom)) {
      throw new BadRequestException('Tanggal akhir kuasa tidak boleh sebelum tanggal mulai');
    }
  }

  private async validateJudgmentCitations(caseId: string, considerations: string): Promise<void> {
    const [citationCount, validCitations] = await Promise.all([
      this.prisma.citation.count({
        where: { caseId, documentType: CitationDocumentType.PUTUSAN },
      }),
      this.prisma.citation.count({
        where: {
          caseId,
          documentType: CitationDocumentType.PUTUSAN,
          validationStatus: CitationValidationStatus.VALID,
        },
      }),
    ]);
    if (citationCount === 0 || validCitations === 0) {
      throw new BadRequestException(
        'Tautkan minimal satu sitasi PUTUSAN yang tervalidasi melalui F3 sebelum menyusun putusan',
      );
    }
    if (!considerations.trim()) {
      throw new BadRequestException('Pertimbangan hukum wajib diisi');
    }
  }
}
