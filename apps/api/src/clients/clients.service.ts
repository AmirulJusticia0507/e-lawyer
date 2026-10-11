import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto, QueryClientDto, UpdateClientDto } from './dto/client.dto';
import { getPagination, toPaginated } from '../common/utils/pagination';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientDto, actorId: string) {
    await this.ensureUnique(dto);
    return this.prisma.client.create({
      data: {
        type: dto.type,
        fullName: dto.fullName,
        nik: dto.nik,
        npwp: dto.npwp,
        email: dto.email,
        phone: dto.phone,
        address: dto.address as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
        createdById: actorId,
      },
    });
  }

  async findAll(query: QueryClientDto) {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.ClientWhereInput = this.buildWhere(query.search);

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { _count: { select: { parties: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.client.count({ where }),
    ]);

    return toPaginated(items, total, pagination);
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        parties: {
          include: { case: { select: { id: true, caseNumber: true, title: true, status: true } } },
          orderBy: { createdAt: 'desc' },
        },
        interactions: { orderBy: { occurredAt: 'desc' } },
      },
    });
    if (!client) {
      throw new NotFoundException('Klien tidak ditemukan');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureExists(id);
    await this.ensureUnique(dto, id);
    return this.prisma.client.update({
      where: { id },
      data: {
        type: dto.type,
        fullName: dto.fullName,
        nik: dto.nik,
        npwp: dto.npwp,
        email: dto.email,
        phone: dto.phone,
        address: dto.address as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.ensureExists(id);
    await this.prisma.client.delete({ where: { id } });
    return { success: true };
  }

  private buildWhere(search?: string): Prisma.ClientWhereInput {
    if (!search) {
      return {};
    }
    const hasSearch = search.length >= 2;
    return hasSearch
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { nik: { contains: search, mode: 'insensitive' } },
            { npwp: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Klien tidak ditemukan');
    }
  }

  private async ensureUnique(
    dto: Pick<CreateClientDto, 'nik' | 'email' | 'phone'>,
    excludeId?: string,
  ): Promise<void> {
    if (dto.nik) {
      const dupNik = await this.prisma.client.findFirst({
        where: { nik: dto.nik, NOT: { id: excludeId } },
        select: { id: true, fullName: true },
      });
      if (dupNik) {
        throw new ConflictException(`NIK sudah dipakai oleh klien "${dupNik.fullName}"`);
      }
    }
    if (dto.email) {
      const dupEmail = await this.prisma.client.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' }, NOT: { id: excludeId } },
        select: { id: true, fullName: true },
      });
      if (dupEmail) {
        throw new ConflictException(`Email sudah dipakai oleh klien "${dupEmail.fullName}"`);
      }
    }
  }
}