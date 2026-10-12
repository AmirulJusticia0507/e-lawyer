import {
  buildTsQuery,
  distanceToScore,
  EMBEDDING_DIMENSIONS,
  hasUnsafeTsQueryCharacters,
  toVectorLiteral,
  validateEmbedding,
} from './search-query';

describe('search-query', () => {
  describe('buildTsQuery', () => {
    it('menggabungkan seluruh kata dengan operator AND dan prefix', () => {
      expect(buildTsQuery('gugatan wanita')).toBe('gugatan:* & wanita:*');
    });

    it('menetralkan karakter khusus tsquery', () => {
      expect(buildTsQuery('foo & bar | baz')).toBe('foo:* & bar:* & baz:*');
    });

    it('menghasilkan null untuk input kosong atau hanya simbol', () => {
      expect(buildTsQuery('')).toBeNull();
      expect(buildTsQuery('   ')).toBeNull();
      expect(buildTsQuery('!!!')).toBeNull();
      expect(buildTsQuery('***')).toBeNull();
    });

    it('tidak mengizinkan operator tsquery mentah dari pengguna', () => {
      const query = buildTsQuery('a | b; drop table "Article"');
      expect(query).toBe('a:* & b:* & drop:* & table:* & Article:*');
      expect(query).not.toContain(';');
      expect(query).not.toContain('"');
    });

    it('mempertahankan huruf beraksara Indonesia', () => {
      expect(buildTsQuery('perjanjian kerja')).toBe('perjanjian:* & kerja:*');
    });

    it('membuang tanda baca di akhir kata', () => {
      expect(buildTsQuery('wanita,')).toBe('wanita:*');
    });
  });

  describe('hasUnsafeTsQueryCharacters', () => {
    it('mendeteksi karakter berbahaya', () => {
      expect(hasUnsafeTsQueryCharacters('a & b')).toBe(true);
      expect(hasUnsafeTsQueryCharacters('aman')).toBe(false);
    });
  });

  describe('validateEmbedding', () => {
    it('menolak larik yang bukan angka', () => {
      expect(validateEmbedding('bukan array')).toEqual({
        valid: false,
        reason: 'embedding harus berupa array angka',
      });
    });

    it('menolak dimensi yang tidak sesuai', () => {
      const result = validateEmbedding([0.1, 0.2]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain(String(EMBEDDING_DIMENSIONS));
    });

    it('menolak nilai NaN atau Infinity', () => {
      const vector = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
      vector[0] = Number.NaN;
      expect(validateEmbedding(vector).valid).toBe(false);
    });

    it('menerima embedding dengan dimensi tepat', () => {
      const vector = new Array(EMBEDDING_DIMENSIONS).fill(0.1);
      expect(validateEmbedding(vector)).toEqual({ valid: true });
    });

    it('mendukung dimensi kustom', () => {
      expect(validateEmbedding([0.1, 0.2, 0.3], 3).valid).toBe(true);
      expect(validateEmbedding([0.1, 0.2], 3).valid).toBe(false);
    });
  });

  describe('toVectorLiteral', () => {
    it('mengubah larik menjadi literal pgvector', () => {
      expect(toVectorLiteral([0.5, -0.25])).toBe('[0.5,-0.25]');
    });
  });

  describe('distanceToScore', () => {
    it('mengubah jarak kosinus menjadi skor 0..1', () => {
      expect(distanceToScore(0)).toBe(1);
      expect(distanceToScore(1)).toBe(0);
      expect(distanceToScore(0.25)).toBeCloseTo(0.75);
    });

    it('menjepit nilai di luar rentang', () => {
      expect(distanceToScore(-1)).toBe(1);
      expect(distanceToScore(5)).toBe(0);
      expect(distanceToScore(Number.NaN)).toBe(0);
    });
  });
});