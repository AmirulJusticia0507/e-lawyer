import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TimeEntryStatus, Escrow, EscrowTransaction, TaxRecord, Invoice, Payment, InvoiceItem, TaxType, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { calculateTimeAmount, elapsedMinutes, validateFeeValues } from './billing.rules';
import {
  CreateFeeSchemeDto,
  CreateManualTimeEntryDto,
  QueryFeeSchemeDto,
  QueryTimeEntryDto,
  StartTimerDto,
  CreatePaymentDto,
  ProcessPaymentDto,
  CreateInvoiceDto,
  InvoiceSummaryDto,
} from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listTimeEntries(query: QueryTimeEntryDto) {
    return this.prisma.timeEntry.findMany({
      where: { caseId: query.caseId, userId: query.userId },
      orderBy: { startedAt: 'desc' },
      include: { case: { select: { caseNumber: true, title: true } } },
    });
  }

  async startTimer(dto: StartTimerDto, userId: string) {
    await this.ensureCase(dto.caseId);
    const running = await this.prisma.timeEntry.findFirst({
      where: { userId, status: TimeEntryStatus.RUNNING },
      select: { id: true },
    });
    if (running) throw new ConflictException('Masih ada timer aktif');
    return this.prisma.timeEntry.create({
      data: {
        caseId: dto.caseId,
        userId,
        description: dto.description,
        billable: dto.billable ?? true,
        hourlyRate: dto.hourlyRate,
        status: TimeEntryStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  async stopTimer(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Time entry tidak ditemukan');
    if (entry.status !== TimeEntryStatus.RUNNING)
      throw new ConflictException('Timer sudah dihentikan');
    const endedAt = new Date();
    const durationMinutes = elapsedMinutes(entry.startedAt, endedAt);
    const rate = entry.hourlyRate ? Number(entry.hourlyRate) : undefined;
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        status: TimeEntryStatus.STOPPED,
        endedAt,
        durationMinutes,
        amount: calculateTimeAmount(durationMinutes, rate),
      },
    });
  }

  async createManualTimeEntry(dto: CreateManualTimeEntryDto, userId: string) {
    await this.ensureCase(dto.caseId);
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    const durationMinutes = elapsedMinutes(startedAt, endedAt);
    return this.prisma.timeEntry.create({
      data: {
        caseId: dto.caseId,
        userId,
        description: dto.description,
        billable: dto.billable ?? true,
        hourlyRate: dto.hourlyRate,
        amount: calculateTimeAmount(durationMinutes, dto.hourlyRate),
        status: TimeEntryStatus.STOPPED,
        startedAt,
        endedAt,
        durationMinutes,
      },
    });
  }

  listFeeSchemes(query: QueryFeeSchemeDto) {
    return this.prisma.feeScheme.findMany({
      where: { caseId: query.caseId, clientId: query.clientId, type: query.type, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFeeScheme(dto: CreateFeeSchemeDto) {
    if (!dto.caseId && !dto.clientId)
      throw new ConflictException('Skema tarif harus terkait perkara atau klien');
    validateFeeValues(dto.type, dto);
    if (dto.caseId) await this.ensureCase(dto.caseId);
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException('Klien tidak ditemukan');
    }
    return this.prisma.feeScheme.create({
      data: {
        ...dto,
        currency: dto.currency?.toUpperCase() ?? 'IDR',
        amount: dto.amount === undefined ? undefined : new Prisma.Decimal(dto.amount),
        hourlyRate: dto.hourlyRate === undefined ? undefined : new Prisma.Decimal(dto.hourlyRate),
        successPercentage:
          dto.successPercentage === undefined
            ? undefined
            : new Prisma.Decimal(dto.successPercentage),
      },
    });
  }

  async deactivateFeeScheme(id: string) {
    const existing = await this.prisma.feeScheme.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Skema tarif tidak ditemukan');
    return this.prisma.feeScheme.update({ where: { id }, data: { active: false } });
  }

  async createEscrowAccount(caseId: string, clientId: string, currency: string = 'IDR') {
    await this.ensureCase(caseId);
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Klien tidak ditemukan');

    return this.prisma.escrow.create({
      data: {
        caseId,
        clientId,
        currency: currency.toUpperCase(),
        balance: 0,
      },
      include: {
        case: { select: { caseNumber: true, title: true } },
        client: { select: { fullName: true, email: true } },
      },
    });
  }

  async addEscrowFunds(escrowId: string, amount: number, invoiceId: string, actorId: string, notes: string = '') {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow account tidak ditemukan');

    const newBalance = escrow.balance
      ? escrow.balance.plus(new Prisma.Decimal(amount))
      : new Prisma.Decimal(amount);

    await this.prisma.escrowTransaction.create({
      data: {
        escrowId,
        invoiceId,
        actorId,
        type: 'DEPOSIT',
        amount: new Prisma.Decimal(amount),
        balanceAfter: newPrismaDecimal(newBalance),
        notes,
      },
    });

    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { balance: newPrismaDecimal(newBalance) },
    });
  }

  async releaseEscrowFunds(escrowId: string, invoiceId: string, actorId: string, notes: string = '') {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow account tidak ditemukan');

    await this.prisma.escrowTransaction.create({
      data: {
        escrowId,
        invoiceId,
        actorId,
        type: 'RELEASE',
        amount: escrow.balance as any,
        balanceAfter: new Prisma.Decimal(0),
        notes,
      },
    });

    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { balance: new Prisma.Decimal(0) },
    });
  }

  async createInvoiceFromTimeEntry(
    caseId: string,
    clientId: string,
    timeEntryIds: string[],
    actorId: string,
  ) {
    await this.ensureCase(caseId);
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Klien tidak ditemukan');

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { id: { in: timeEntryIds }, caseId, userId: actorId },
      include: { invoiceItem: true },
    });

    const totalAmount = timeEntries.reduce(
      (sum, entry) => sum.add(entry.invoiceItem?.amount ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );

    // Create invoice items
    const invoiceItemsData = timeEntries.map((entry) => ({
      timeEntryId: entry.id,
      description: `${entry.case?.title} - ${entry.description || 'Jam kerja'}`,
      quantity: new Prisma.Decimal(1),
      unitPrice: entry.invoiceItem?.amount ?? new Prisma.Decimal(0),
      amount: entry.invoiceItem?.amount ?? new Prisma.Decimal(0),
    }));

    const invoice = await this.prisma.invoice.create({
      data: {
        caseId,
        clientId,
        status: 'DRAFT',
        items: {
          create: invoiceItemsData,
        },
        totalAmount,
      },
      include: { items: true, client: { select: { fullName: true, email: true } } },
    });

    // Add tax (PPh 21/23 - 10% as default example)
    const taxRate = new Prisma.Decimal(0.1);
    const taxAmount = totalAmount.mul(taxRate);

    await this.prisma.taxRecord.create({
      data: {
        invoiceId: invoice.id,
        type: 'PPH21' as TaxType,
        rate: taxRate,
        taxBase: totalAmount,
        amount: taxAmount,
      },
    });

    // Update invoice with tax
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: totalAmount.add(taxAmount),
      },
    });

    return invoice;
  }

  private async ensureCase(id: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!caseRecord) throw new NotFoundException('Perkara tidak ditemukan');
  }

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');

    return this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        reference: dto.reference || `PAY-${Date.now()}`,
        status: 'PENDING',
        method: dto.method,
        amount: new Prisma.Decimal(dto.amount),
        metadata: { processedBy: actorId },
      },
    });
  }

  async processPayment(dto: ProcessPaymentDto, actorId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { reference: dto.reference },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    const endedAt = new Date(dto.paidAt);
    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { reference: payment.reference },
        data: {
          status: 'CONFIRMED',
          paidAt: endedAt,
          metadata: { confirmedBy: actorId },
        },
      });

      // Update invoice status if all payments confirmed
      const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
      if (!invoice) return updatedPayment;

      const totalPaid = await tx.payment.findMany({
        where: { invoiceId: invoice.id, status: 'CONFIRMED' },
      });
      const totalAmount = invoice.totalAmount;
      const paidSum = totalPaid.reduce(
        (sum, p) => sum.add(p.amount as any),
        new Prisma.Decimal(0),
      );

      if (paidSum.gte(totalAmount)) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID' },
        });
      }

      // Rekonsiliasi: catat saldo eskrow jika ada invoice terkait
      if (invoice.escrowId) {
        await tx.escrow.update({
          where: { id: invoice.escrowId },
          data: { balance: new Prisma.Decimal(0) },
        });
        await tx.escrowTransaction.create({
          data: {
            escrowId: invoice.escrowId,
            type: 'RECONCILIATION',
            amount: totalAmount,
            balanceAfter: new Prisma.Decimal(0),
            notes: `Rekonsiliasi pembayaran invoice ${invoice.id}`,
          },
        });
      }

      return updatedPayment;
    });
  }

  async reconcilePayments(caseId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { invoice: { caseId } },
      include: { invoice: true },
    });

    const reconciliation = payments.reduce((acc, payment) => {
      const invoice = acc.invoices.find((i) => i.id === payment.invoiceId);
      if (!invoice) {
        acc.invoices.push({
          id: payment.invoiceId,
          totalPaid: new Prisma.Decimal(0),
          totalAmount: invoice?.totalAmount ?? new Prisma.Decimal(0),
          status: 'UNPAID',
        });
        acc.total += new Prisma.Decimal(0);
        acc.unpaidTotal += invoice.totalAmount ?? new Prisma.Decimal(0);
      } else {
        acc.totalPaid = acc.totalPaid ?? new Prisma.Decimal(0);
        acc.totalAmount = acc.totalAmount ?? invoice.totalAmount;
        acc.total = acc.total ?? new Prisma.Decimal(0);
        acc.total = acc.total.add(payment.amount as any);
        if (payment.status === 'CONFIRMED') {
          acc.unpaidTotal = acc.unpaidTotal ?? invoice.totalAmount;
          acc.unpaidTotal = acc.unpaidTotal.subtract(payment.amount as any);
        }
      }
      return acc;
    }, {} as {
      invoices: Array<{
        id: string;
        totalPaid: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        status: string;
      }>;
      total: Prisma.Decimal;
      unpaidTotal: Prisma.Decimal;
    });

    return reconciliation;
  }
}

// Helper function for Decimal operations
function newPrismaDecimal(value: Prisma.Decimal | number): Prisma.Decimal {
  if (typeof value === 'number') return new Prisma.Decimal(value);
  return value;
}