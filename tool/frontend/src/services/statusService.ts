import { PaginatedResponse, RTIStatus } from '../types/db';
import { mockStatuses } from '../data/mockData';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    pagination: { page, pageSize, totalItems, totalPages }
  };
};

export const statusService = {
  list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<RTIStatus>> => {
    await sleep(200);
    return paginate([...mockStatuses].sort((a, b) => (a.name > b.name ? 1 : -1)), page, pageSize);
  },

  create: async (payload: { name: string }): Promise<RTIStatus> => {
    await sleep(150);
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockStatuses.some((s) => s.name === name)) throw new Error('Conflict (unique constraint)');
    const now = new Date().toISOString();
    const created: RTIStatus = { id: `st-${Date.now()}`, name, createdAt: now, updatedAt: now };
    mockStatuses.unshift(created);
    return created;
  },

  update: async (id: string, payload: { name: string }): Promise<RTIStatus> => {
    await sleep(150);
    const idx = mockStatuses.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Status not found');
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockStatuses.some((s) => s.name === name && s.id !== id)) throw new Error('Conflict (unique constraint)');
    const next: RTIStatus = { ...mockStatuses[idx], name, updatedAt: new Date().toISOString() };
    mockStatuses[idx] = next;
    return next;
  },

  remove: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockStatuses.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Status not found');
    mockStatuses.splice(idx, 1);
  }
};

