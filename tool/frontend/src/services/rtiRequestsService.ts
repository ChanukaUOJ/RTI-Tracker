import { PaginatedResponse, RTIRequestDetails, RTIRequestRow, RTITemplateDB, Sender, Receiver } from '../types/db';
import {
  mockInstitutions,
  mockPositions,
  mockReceivers,
  mockRTIRequests,
  mockRTITemplatesDB,
  mockSenders,
  mockStatusHistories
} from '../data/mockData';

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

const enrichRequestRow = (r: RTIRequestRow): RTIRequestRow => {
  const sender = mockSenders.find((s) => s.id === r.senderId);
  const receiver = mockReceivers.find((x) => x.id === r.receiverId);
  const inst = receiver ? mockInstitutions.find((i) => i.id === receiver.institutionId) : undefined;
  const pos = receiver ? mockPositions.find((p) => p.id === receiver.positionId) : undefined;
  const tmpl = r.rtiTemplateId ? mockRTITemplatesDB.find((t) => t.id === r.rtiTemplateId) : undefined;
  return {
    ...r,
    senderName: sender?.name ?? r.senderName,
    receiverInstitution: inst?.name ?? r.receiverInstitution,
    receiverPosition: pos?.name ?? r.receiverPosition,
    rtiTemplateTitle: tmpl?.title ?? r.rtiTemplateTitle ?? null
  };
};

export const rtiRequestsService = {
  list: async (page = 1, pageSize = 10): Promise<PaginatedResponse<RTIRequestRow>> => {
    await sleep(300);
    const list = [...mockRTIRequests].map(enrichRequestRow).sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    return paginate(list, page, pageSize);
  },

  details: async (id: string): Promise<RTIRequestDetails> => {
    await sleep(250);
    const req = mockRTIRequests.find((r) => r.id === id);
    if (!req) throw new Error('RTI Request not found');

    const sender = mockSenders.find((s) => s.id === req.senderId);
    const receiver = mockReceivers.find((x) => x.id === req.receiverId);
    const inst = receiver ? mockInstitutions.find((i) => i.id === receiver.institutionId) : undefined;
    const pos = receiver ? mockPositions.find((p) => p.id === receiver.positionId) : undefined;
    const tmpl = req.rtiTemplateId ? mockRTITemplatesDB.find((t) => t.id === req.rtiTemplateId) : undefined;

    return {
      request: {
        id: req.id,
        title: req.title,
        description: req.description ?? null,
        senderId: req.senderId,
        senderName: sender?.name ?? req.senderName,
        senderEmail: sender?.email ?? null,
        senderAddress: sender?.address ?? null,
        senderContactNo: sender?.contactNo ?? null,
        receiverId: req.receiverId,
        receiverEmail: receiver?.email ?? null,
        receiverAddress: receiver?.address ?? null,
        receiverContactNo: receiver?.contactNo ?? null,
        institutionId: receiver?.institutionId ?? 'unknown',
        institutionName: inst?.name ?? req.receiverInstitution,
        positionId: receiver?.positionId ?? 'unknown',
        positionName: pos?.name ?? req.receiverPosition,
        rtiTemplateId: req.rtiTemplateId ?? null,
        rtiTemplateTitle: tmpl?.title ?? req.rtiTemplateTitle ?? null,
        rtiTemplateDescription: tmpl?.description ?? null,
        rtiTemplateFile: tmpl?.file ?? null,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt
      },
      statusHistories: mockStatusHistories
        .filter((h) => h.rtiRequestId === id)
        .sort((a, b) => (b.entryTime > a.entryTime ? 1 : -1))
    };
  },

  create: (payload: {
    title: string;
    description?: string | null;
    senderId: string;
    receiverId: string;
    rtiTemplateId?: string | null;
  }) =>
    (async () => {
      await sleep(200);
      if (!payload.title) throw new Error('title is required');
      if (!payload.senderId) throw new Error('senderId is required');
      if (!payload.receiverId) throw new Error('receiverId is required');
      const now = new Date().toISOString();
      const created: RTIRequestRow = enrichRequestRow({
        id: `req-${Date.now()}`,
        title: payload.title,
        description: payload.description ?? null,
        senderId: payload.senderId,
        senderName: '',
        receiverId: payload.receiverId,
        receiverInstitution: '',
        receiverPosition: '',
        rtiTemplateId: payload.rtiTemplateId ?? null,
        rtiTemplateTitle: null,
        createdAt: now,
        updatedAt: now
      });
      mockRTIRequests.unshift(created);
      return { id: created.id };
    })(),

  update: (
    id: string,
    payload: {
      title?: string | null;
      description?: string | null;
      senderId?: string | null;
      receiverId?: string | null;
      rtiTemplateId?: string | null;
    }
  ) =>
    (async () => {
      await sleep(200);
      const idx = mockRTIRequests.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('RTI Request not found');
      const next = enrichRequestRow({
        ...mockRTIRequests[idx],
        title: payload.title ?? mockRTIRequests[idx].title,
        description: payload.description ?? mockRTIRequests[idx].description,
        senderId: payload.senderId ?? mockRTIRequests[idx].senderId,
        receiverId: payload.receiverId ?? mockRTIRequests[idx].receiverId,
        rtiTemplateId: payload.rtiTemplateId ?? null,
        updatedAt: new Date().toISOString()
      });
      mockRTIRequests[idx] = next;
      return { id };
    })(),

  remove: async (id: string): Promise<void> => {
    await sleep(150);
    const idx = mockRTIRequests.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('RTI Request not found');
    mockRTIRequests.splice(idx, 1);
    // also remove related histories to keep view stable
    for (let i = mockStatusHistories.length - 1; i >= 0; i -= 1) {
      if (mockStatusHistories[i].rtiRequestId === id) mockStatusHistories.splice(i, 1);
    }
  },

  // lookups used by the New/Edit RTI Request form
  listSenders: async (page = 1, pageSize = 100): Promise<PaginatedResponse<Sender>> => {
    await sleep(150);
    return paginate([...mockSenders].sort((a, b) => (a.name > b.name ? 1 : -1)), page, pageSize);
  },

  listReceivers: async (page = 1, pageSize = 100): Promise<PaginatedResponse<Receiver>> => {
    await sleep(150);
    const list: Receiver[] = mockReceivers.map((r) => {
      const inst = mockInstitutions.find((i) => i.id === r.institutionId);
      const pos = mockPositions.find((p) => p.id === r.positionId);
      return { ...r, institutionName: inst?.name, positionName: pos?.name };
    });
    return paginate(list.sort((a, b) => ((a.institutionName ?? '') > (b.institutionName ?? '') ? 1 : -1)), page, pageSize);
  },

  listTemplates: async (page = 1, pageSize = 100): Promise<PaginatedResponse<RTITemplateDB>> => {
    await sleep(150);
    return paginate([...mockRTITemplatesDB].sort((a, b) => (a.title > b.title ? 1 : -1)), page, pageSize);
  },

  createTemplate: async (payload: { title: string; description?: string | null; file: string }): Promise<RTITemplateDB> => {
    await sleep(200);
    const title = payload.title?.trim();
    if (!title) throw new Error('title is required');
    if (!payload.file) throw new Error('file is required');
    if (mockRTITemplatesDB.some((t) => t.title === title)) throw new Error('Conflict (unique constraint)');
    const now = new Date().toISOString();
    const created: RTITemplateDB = {
      id: `tmpl-${Date.now()}`,
      title,
      description: payload.description ?? null,
      file: payload.file,
      createdAt: now,
      updatedAt: now
    };
    mockRTITemplatesDB.unshift(created);
    return created;
  }
};

