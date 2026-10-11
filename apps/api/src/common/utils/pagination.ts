export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginatedMeta;
}

export function getPagination(pageRaw?: number, limitRaw?: number): PaginationParams {
  const page = Math.max(1, Math.floor(pageRaw ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(limitRaw ?? 10)));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function toPaginated<T>(items: T[], total: number, params: PaginationParams): Paginated<T> {
  return {
    items,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / params.limit),
    },
  };
}