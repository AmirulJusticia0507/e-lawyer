export const EMBEDDING_DIMENSIONS = 1536;

const TS_QUERY_UNSAFE = /['&|!:*()\\]/g;

/**
 * Menbersihkan input pengguna menjadi tsquery yang aman. Semua kata kunci
 * digabung dengan operator AND sehingga hasil tidak melebar tanpa sengaja.
 */
export function buildTsQuery(input: string): string | null {
  const cleaned = input.replace(TS_QUERY_UNSAFE, ' ').trim();
  if (cleaned === '') return null;

  const terms = cleaned
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((term) => term.length > 0);

  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(' & ');
}

export function hasUnsafeTsQueryCharacters(input: string): boolean {
  return TS_QUERY_UNSAFE.test(input);
}

export interface VectorValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Memastikan embedding berupa larik angka dengan dimensi yang sesuai sehingga
 * aman dipakai sebagai parameter kueri pgvector.
 */
export function validateEmbedding(value: unknown, dimensions = EMBEDDING_DIMENSIONS): VectorValidation {
  if (!Array.isArray(value)) {
    return { valid: false, reason: 'embedding harus berupa array angka' };
  }
  if (value.length !== dimensions) {
    return {
      valid: false,
      reason: `embedding harus memiliki ${dimensions} dimensi, diterima ${value.length}`,
    };
  }
  const invalid = value.find((item) => typeof item !== 'number' || !Number.isFinite(item));
  if (invalid !== undefined) {
    return { valid: false, reason: 'embedding hanya boleh berisi angka finite' };
  }
  return { valid: true };
}

export function toVectorLiteral(value: number[]): string {
  return `[${value.join(',')}]`;
}

/** Mengubah jarak kosinus pgvector (0 = identik) menjadi skor kemiripan 0..1. */
export function distanceToScore(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, Math.min(1, 1 - distance));
}