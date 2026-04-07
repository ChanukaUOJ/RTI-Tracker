export function normalizePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '10', 10) || 10));
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

export function paginationMeta({ page, pageSize, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return { page, pageSize, totalItems, totalPages };
}

