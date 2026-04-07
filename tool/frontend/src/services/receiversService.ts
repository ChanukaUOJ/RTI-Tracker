import { Institution, PaginatedResponse, Position, Receiver } from '../types/db';
import { mockInstitutions, mockPositions, mockReceivers } from '../data/mockData';

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

const enrichReceiver = (r: Receiver): Receiver => {
  const inst = mockInstitutions.find((i) => i.id === r.institutionId);
  const pos = mockPositions.find((p) => p.id === r.positionId);
  return {
    ...r,
    institutionName: inst?.name,
    positionName: pos?.name
  };
};

export const receiversService = {
  listReceivers: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Receiver>> => {
    await sleep(250);
    const list = [...mockReceivers].map(enrichReceiver).sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    return paginate(list, page, pageSize);
  },

  createReceiver: async (payload: {
    positionId: string;
    institutionId: string;
    email?: string | null;
    address?: string | null;
    contactNo?: string | null;
  }): Promise<Receiver> => {
    await sleep(200);
    if (!payload.positionId) throw new Error('positionId is required');
    if (!payload.institutionId) throw new Error('institutionId is required');
    if (!payload.email && !payload.contactNo) throw new Error('email or contactNo is required');
    const now = new Date().toISOString();
    const created: Receiver = {
      id: `rcv-${Date.now()}`,
      positionId: payload.positionId,
      institutionId: payload.institutionId,
      email: payload.email ?? null,
      address: payload.address ?? null,
      contactNo: payload.contactNo ?? null,
      createdAt: now,
      updatedAt: now
    };
    mockReceivers.unshift(created);
    return enrichReceiver(created);
  },

  updateReceiver: async (
    id: string,
    payload: {
      positionId?: string | null;
      institutionId?: string | null;
      email?: string | null;
      address?: string | null;
      contactNo?: string | null;
    }
  ): Promise<Receiver> => {
    await sleep(200);
    const idx = mockReceivers.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Receiver not found');
    const next: Receiver = {
      ...mockReceivers[idx],
      positionId: payload.positionId ?? mockReceivers[idx].positionId,
      institutionId: payload.institutionId ?? mockReceivers[idx].institutionId,
      email: payload.email ?? null,
      address: payload.address ?? null,
      contactNo: payload.contactNo ?? null,
      updatedAt: new Date().toISOString()
    };
    if (!next.email && !next.contactNo) throw new Error('email or contactNo is required');
    mockReceivers[idx] = next;
    return enrichReceiver(next);
  },

  removeReceiver: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockReceivers.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Receiver not found');
    mockReceivers.splice(idx, 1);
  },

  listInstitutions: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Institution>> => {
    await sleep(200);
    const list = [...mockInstitutions].sort((a, b) => (a.name > b.name ? 1 : -1));
    return paginate(list, page, pageSize);
  },

  createInstitution: async (payload: { name: string }): Promise<Institution> => {
    await sleep(150);
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockInstitutions.some((i) => i.name === name)) throw new Error('Conflict (unique constraint)');
    const now = new Date().toISOString();
    const created: Institution = { id: `inst-${Date.now()}`, name, createdAt: now, updatedAt: now };
    mockInstitutions.unshift(created);
    return created;
  },

  updateInstitution: async (id: string, payload: { name: string }): Promise<Institution> => {
    await sleep(150);
    const idx = mockInstitutions.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Institution not found');
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockInstitutions.some((i) => i.name === name && i.id !== id)) throw new Error('Conflict (unique constraint)');
    const next: Institution = { ...mockInstitutions[idx], name, updatedAt: new Date().toISOString() };
    mockInstitutions[idx] = next;
    return next;
  },

  removeInstitution: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockInstitutions.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Institution not found');
    mockInstitutions.splice(idx, 1);
  },

  listPositions: async (page = 1, pageSize = 10): Promise<PaginatedResponse<Position>> => {
    await sleep(200);
    const list = [...mockPositions].sort((a, b) => (a.name > b.name ? 1 : -1));
    return paginate(list, page, pageSize);
  },

  createPosition: async (payload: { name: string }): Promise<Position> => {
    await sleep(150);
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockPositions.some((p) => p.name === name)) throw new Error('Conflict (unique constraint)');
    const now = new Date().toISOString();
    const created: Position = { id: `pos-${Date.now()}`, name, createdAt: now, updatedAt: now };
    mockPositions.unshift(created);
    return created;
  },

  updatePosition: async (id: string, payload: { name: string }): Promise<Position> => {
    await sleep(150);
    const idx = mockPositions.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Position not found');
    const name = payload.name?.trim();
    if (!name) throw new Error('name is required');
    if (mockPositions.some((p) => p.name === name && p.id !== id)) throw new Error('Conflict (unique constraint)');
    const next: Position = { ...mockPositions[idx], name, updatedAt: new Date().toISOString() };
    mockPositions[idx] = next;
    return next;
  },

  removePosition: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockPositions.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Position not found');
    mockPositions.splice(idx, 1);
  }
};

