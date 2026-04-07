import { PaginatedResponse, Sender } from '../types/db';
import { mockSenders } from '../data/mockData';

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

export const sendersService = {
  list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Sender>> => {
    await sleep(250);
    return paginate([...mockSenders].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)), page, pageSize);
  },

  create: async (payload: {
    name: string;
    email?: string | null;
    address?: string | null;
    contactNo?: string | null;
  }): Promise<Sender> => {
    await sleep(200);
    if (!payload.name) throw new Error('name is required');
    if (!payload.email && !payload.contactNo) throw new Error('email or contactNo is required');
    const now = new Date().toISOString();
    const created: Sender = {
      id: `snd-${Date.now()}`,
      name: payload.name,
      email: payload.email ?? null,
      address: payload.address ?? null,
      contactNo: payload.contactNo ?? null,
      createdAt: now,
      updatedAt: now
    };
    mockSenders.unshift(created);
    return created;
  },

  update: async (
    id: string,
    payload: { name?: string | null; email?: string | null; address?: string | null; contactNo?: string | null }
  ): Promise<Sender> => {
    await sleep(200);
    const idx = mockSenders.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Sender not found');
    const next: Sender = {
      ...mockSenders[idx],
      name: payload.name ?? mockSenders[idx].name,
      email: payload.email ?? null,
      address: payload.address ?? null,
      contactNo: payload.contactNo ?? null,
      updatedAt: new Date().toISOString()
    };
    if (!next.email && !next.contactNo) throw new Error('email or contactNo is required');
    mockSenders[idx] = next;
    return next;
  },

  remove: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockSenders.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Sender not found');
    mockSenders.splice(idx, 1);
  }
};

