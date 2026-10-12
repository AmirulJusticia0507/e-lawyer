import { BadRequestException } from '@nestjs/common';
import { FeeSchemeType } from '@prisma/client';

export function elapsedMinutes(startedAt: Date, endedAt: Date): number {
  const milliseconds = endedAt.getTime() - startedAt.getTime();
  if (milliseconds <= 0) throw new BadRequestException('Waktu selesai harus setelah waktu mulai');
  return Math.max(1, Math.ceil(milliseconds / 60_000));
}

export function calculateTimeAmount(minutes: number, hourlyRate?: number): number | undefined {
  if (hourlyRate === undefined) return undefined;
  return Math.round((minutes / 60) * hourlyRate * 100) / 100;
}

export function validateFeeValues(
  type: FeeSchemeType,
  values: { amount?: number; hourlyRate?: number; successPercentage?: number },
): void {
  if (type === FeeSchemeType.HOURLY && values.hourlyRate === undefined)
    throw new BadRequestException('Tarif per jam wajib diisi');
  if (
    (type === FeeSchemeType.RETAINER || type === FeeSchemeType.FIXED) &&
    values.amount === undefined
  )
    throw new BadRequestException('Nominal wajib diisi');
  if (type === FeeSchemeType.SUCCESS_FEE && values.successPercentage === undefined)
    throw new BadRequestException('Persentase success fee wajib diisi');
}
