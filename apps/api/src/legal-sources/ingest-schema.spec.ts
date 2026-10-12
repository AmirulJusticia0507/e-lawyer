import { parseLegalSourceDataset } from './ingest-schema';

const validDataset = {
  version: 1,
  regulations: [
    {
      slug: 'uu-1-2024',
      type: 'LAW',
      number: '1',
      year: 2024,
      title: 'Undang-Undang Contoh',
      status: 'ACTIVE',
      articles: [{ unitKey: 'pasal-1', articleNumber: '1', content: 'Isi pasal.' }],
    },
    {
      slug: 'uu-2-2025',
      type: 'LAW',
      number: '2',
      year: 2025,
      title: 'Undang-Undang Perubahan',
      articles: [],
    },
  ],
  amendments: [
    {
      amendingRegulationSlug: 'uu-2-2025',
      amendedRegulationSlug: 'uu-1-2024',
      articleUnitKey: 'pasal-1',
    },
  ],
};

describe('parseLegalSourceDataset', () => {
  it('normalizes and accepts a valid dataset', () => {
    const result = parseLegalSourceDataset(validDataset);
    expect(result.regulations[0].slug).toBe('uu-1-2024');
    expect(result.regulations[0].articles[0].status).toBe('ACTIVE');
    expect(result.amendments[0].type).toBe('AMENDS');
  });

  it('rejects duplicate article keys', () => {
    const input = structuredClone(validDataset) as unknown as Record<string, unknown>;
    const regulations = input.regulations as Array<Record<string, unknown>>;
    const articles = regulations[0].articles as Array<Record<string, unknown>>;
    articles.push({
      unitKey: 'pasal-1',
      articleNumber: '1',
      content: 'Duplikat.',
    });
    expect(() => parseLegalSourceDataset(input)).toThrow('unitKey duplikat');
  });

  it('rejects invalid effective periods', () => {
    const input = structuredClone(validDataset) as Record<string, unknown>;
    const regulations = input.regulations as Array<Record<string, unknown>>;
    regulations[0].effectiveFrom = '2025-01-01';
    regulations[0].effectiveUntil = '2024-01-01';
    expect(() => parseLegalSourceDataset(input)).toThrow('tidak boleh sebelum');
  });

  it('rejects unresolved amendment references', () => {
    const input = structuredClone(validDataset);
    input.amendments[0].articleUnitKey = 'pasal-99';
    expect(() => parseLegalSourceDataset(input)).toThrow('tidak ditemukan');
  });
});
