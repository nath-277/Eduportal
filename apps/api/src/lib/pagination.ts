import type { PaginatedResponse } from '@eduportal/shared';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  rawPage: string | undefined,
  rawLimit: string | undefined
): PaginationParams {
  const page = Math.max(1, Number.parseInt(rawPage ?? `${DEFAULT_PAGE}`, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(rawLimit ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
