import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HearingsService } from './hearings.service';

describe('HearingsService', () => {
  const tx = {
    case: { findUnique: jest.fn() },
    hearing: { findMany: jest.fn(), create: jest.fn() },
    hearingSla: { createMany: jest.fn() },
    reminder: { createMany: jest.fn() },
  };
  const prisma = {
    hearing: { findMany: jest.fn() },
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;
  const service = new HearingsService(prisma);
  const dto = {
    caseId: 'case-1',
    startsAt: '2026-10-15T02:00:00.000Z',
    endsAt: '2026-10-15T03:00:00.000Z',
    courtroom: 'Ruang 1',
    judgeName: 'Hakim A',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.case.findUnique.mockResolvedValue({ id: dto.caseId, parties: [{ id: 'party-1' }] });
    tx.hearing.findMany.mockResolvedValue([]);
    tx.hearing.create.mockResolvedValue({ id: 'hearing-1' });
  });

  it('menolak rentang waktu yang tidak valid', async () => {
    await expect(
      service.create({ ...dto, endsAt: dto.startsAt }, 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('menolak bentrok ruangan dan pihak perkara yang sama', async () => {
    tx.hearing.findMany.mockResolvedValue([
      {
        caseId: 'case-2',
        courtroom: 'ruang 1',
        judgeName: 'Hakim B',
        case: { parties: [] },
      },
    ]);
    await expect(service.create(dto, 'user-1')).rejects.toThrow(/ruang sidang ruang 1/i);

    tx.hearing.findMany.mockResolvedValue([
      {
        caseId: 'case-2',
        courtroom: 'Ruang 2',
        judgeName: 'Hakim B',
        case: { parties: [{ id: 'party-1' }] },
      },
    ]);
    await expect(service.create(dto, 'user-1')).rejects.toThrow(/pihak perkara yang sama/);

    tx.hearing.findMany.mockResolvedValue([
      {
        caseId: 'case-2',
        courtroom: 'Ruang 2',
        judgeName: 'hakim a',
        case: { parties: [] },
      },
    ]);
    await expect(service.create(dto, 'user-1')).rejects.toThrow(/hakim hakim a/i);
  });

  it('membuat jadwal setelah pemeriksaan bentrok berhasil', async () => {
    await expect(service.create(dto, 'user-1')).resolves.toEqual({ id: 'hearing-1' });
    expect(tx.hearing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          createdById: 'user-1',
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('menolak perkara yang tidak ditemukan', async () => {
    tx.case.findUnique.mockResolvedValue(null);
    await expect(service.create(dto, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.hearing.create).not.toHaveBeenCalled();
  });
});
