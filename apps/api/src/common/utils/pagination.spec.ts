import { getPagination, toPaginated } from './pagination';

describe('pagination util', () => {
  it('memberikan default page 1 dan limit 10', () => {
    const p = getPagination();
    expect(p).toEqual({ page: 1, limit: 10, skip: 0, take: 10 });
  });

  it('menghitung skip berdasarkan page dan limit', () => {
    const p = getPagination(3, 20);
    expect(p.skip).toBe(40);
    expect(p.take).toBe(20);
  });

  it('membatasi limit maksimal 100', () => {
    expect(getPagination(1, 500).limit).toBe(100);
  });

  it('membangun meta pagination', () => {
    const p = getPagination(2, 10);
    const result = toPaginated(['a'], 21, p);
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3 });
  });
});