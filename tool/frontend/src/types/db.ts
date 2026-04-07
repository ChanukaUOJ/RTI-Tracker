export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type Sender = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  contactNo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Position = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Institution = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Receiver = {
  id: string;
  positionId: string;
  institutionId: string;
  positionName?: string;
  institutionName?: string;
  email: string | null;
  address: string | null;
  contactNo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RTITemplateDB = {
  id: string;
  title: string;
  description: string | null;
  file: string;
  createdAt: string;
  updatedAt: string;
};

export type RTIRequestRow = {
  id: string;
  title: string;
  description: string | null;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverInstitution: string;
  receiverPosition: string;
  rtiTemplateId: string | null;
  rtiTemplateTitle: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RTIStatus = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RTIStatusHistory = {
  id: string;
  rtiRequestId: string;
  statusId: string;
  statusName: string;
  direction: 'sent' | 'received';
  description: string | null;
  entryTime: string;
  exitTime: string | null;
  file: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RTIRequestDetails = {
  request: {
    id: string;
    title: string;
    description: string | null;
    senderId: string;
    senderName: string;
    senderEmail: string | null;
    senderAddress: string | null;
    senderContactNo: string | null;
    receiverId: string;
    receiverEmail: string | null;
    receiverAddress: string | null;
    receiverContactNo: string | null;
    institutionId: string;
    institutionName: string;
    positionId: string;
    positionName: string;
    rtiTemplateId: string | null;
    rtiTemplateTitle: string | null;
    rtiTemplateDescription: string | null;
    rtiTemplateFile: string | null;
    createdAt: string;
    updatedAt: string;
  };
  statusHistories: RTIStatusHistory[];
};

