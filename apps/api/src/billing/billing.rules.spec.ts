import { FeeSchemeType } from '@prisma/client';
import { calculateTimeAmount, elapsedMinutes, validateFeeValues } from './billing.rules';

describe('billing rules', () => {
  it('rounds tracked time up to a full minute and calculates its value', () => {
    const minutes = elapsedMinutes(
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-01T01:00:01Z'),
    );
    expect(minutes).toBe(61);
    expect(calculateTimeAmount(minutes, 600_000)).toBe(610_000);
  });

  it('rejects an invalid time range', () => {
    expect(() => elapsedMinutes(new Date('2026-01-02'), new Date('2026-01-01'))).toThrow();
  });

  it('requires the value belonging to each fee type', () => {
    expect(() => validateFeeValues(FeeSchemeType.HOURLY, {})).toThrow('Tarif per jam');
    expect(() => validateFeeValues(FeeSchemeType.FIXED, { amount: 1 })).not.toThrow();
    expect(() =>
      validateFeeValues(FeeSchemeType.SUCCESS_FEE, { successPercentage: 10 }),
    ).not.toThrow();
  });
});
