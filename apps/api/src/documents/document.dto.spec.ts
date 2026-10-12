import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateDocumentDto } from './dto/document.dto';

describe('CreateDocumentDto nested data validation', () => {
  const base = {
    caseId: '06b0b35b-32e3-4b4d-8f03-6de6c30ca197',
    type: 'POWER_OF_ATTORNEY',
    title: 'Surat Kuasa Khusus',
    powerOfAttorney: {
      type: 'SPECIFIC',
      principalName: 'Pemberi Kuasa',
      attorneyName: 'Advokat',
      attorneyLicenseNo: 'ADV-2026-123',
    },
  };

  it('validates nested identity formats instead of accepting untyped objects', () => {
    const dto = plainToInstance(CreateDocumentDto, {
      ...base,
      powerOfAttorney: { ...base.powerOfAttorney, principalNik: '12345' },
    });

    const errors = validateSync(dto);
    const nested = errors.find((error) => error.property === 'powerOfAttorney');

    expect(nested?.children?.some((error) => error.property === 'principalNik')).toBe(true);
  });

  it('accepts a structurally valid power-of-attorney document request', () => {
    const dto = plainToInstance(CreateDocumentDto, {
      ...base,
      powerOfAttorney: { ...base.powerOfAttorney, principalNik: '1234567890123456' },
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
