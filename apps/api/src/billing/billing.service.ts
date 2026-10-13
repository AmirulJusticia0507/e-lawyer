import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listTimeEntries(caseId: string, userId: string) {
    const where: Record<string, any> = {};
    if (caseId) where.caseId = caseId;
    if (userId) where.userId = userId;
    return this.prisma.timeEntry.findMany({ where });
  }

  startTimer(caseId: string, userId: string, description: string, billable: boolean, hourlyRate: number) {
    return this.prisma.timeEntry.create({
      data: { caseId, userId, description, billable, hourlyRate, status: 'STOPPED' } as any,
    });
  }

  stopTimer(id: string, userId: string) {
    return this.prisma.timeEntry.update({ where: { id, userId }, data: { status: 'STOPPED' as any } });
  }

  createManualTimeEntry(caseId: string, userId: string, startedAt: string, endedAt: string, description: string, billable: boolean, hourlyRate: number) {
    const started = new Date(startedAt);
    const ended = new Date(endedAt);
    const durationMinutes = Math.round((ended.getTime() - started.getTime()) / 60000);
    return this.prisma.timeEntry.create({
      data: {
        caseId, userId, description, billable, hourlyRate,
        amount: hourlyRate * durationMinutes,
        status: 'PAID' as any,
        startedAt, endedAt, durationMinutes,
      } as any,
    });
  }

  listFeeSchemes(caseId: string, clientId: string, type: string) {
    return this.prisma.feeScheme.findMany({ where: { caseId, clientId, type: type as any } });
  }

  createFeeScheme(caseId: string, clientId: string, type: string, name: string, amount: number, hourlyRate: number, currency: string, successPercentage: number) {
    return this.prisma.feeScheme.create({
      data: { caseId, clientId, type, name, amount: hourlyRate > 0 ? amount : undefined, hourlyRate, currency: currency || 'IDR', successPercentage: successPercentage ?? undefined } as any,
    });
  }

  deactivateFeeScheme(id: string) {
    return this.prisma.feeScheme.update({ where: { id }, data: { active: false } });
  }

  // Payment Gateway

  createPayment(invoiceId: string, method: string, amount: number, reference: string, actorId: string) {
    return this.prisma.payment.create({
      data: { invoiceId, reference: reference || `PAY-${Date.now()}`, status: 'PENDING' as any, method, amount, metadata: { processedBy: actorId } } as any,
    });
  }

  processPayment(reference: string, paidAt: string, actorId: string) {
    return this.prisma.payment.update({
      where: { reference },
      data: { status: 'CONFIRMED' as any, paidAt: new Date(paidAt), metadata: { confirmedBy: actorId } } as any,
    });
  }

  async reconcilePayments(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, status: 'CONFIRMED' as any },
    });

    const totalPaid = (payments as any[])?.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0,
    );
    const totalAmount = Number(invoice.total);

    const isPaid = totalPaid >= totalAmount;

    const newStatus = isPaid ? 'PAID' : 'PARTIALLY_PAID';
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    });

    return {
      invoiceId,
      totalAmount,
      totalPaid,
      isPaid,
      status: newStatus,
    };
  }

  // Invoice Generator

  createInvoice(caseId: string, clientId: string, items: any[], subtotal: number, taxRate: number) {
    const taxAmount = subtotal * taxRate / 100;
    const total = subtotal + taxAmount;

    const invoice = this.prisma.invoice.create({
      data: {
        caseId, clientId, status: 'DRAFT' as any,
        subtotal, taxAmount, total,
        items: { create: items } as any,
      } as any,
    });

    // Create tax record
    const taxRecordData = {
      invoiceId: (invoice as any).id,
      type: 'PPH21',
      rate: taxRate,
      taxBase: subtotal,
      amount: taxAmount,
    };
    this.prisma.taxRecord.create({
      data: taxRecordData as any,
    });

    return invoice;
  }
}