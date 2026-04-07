import { Template } from '../types/rti';
import { Institution, Position, Receiver, RTIRequestRow, RTIStatus, RTIStatusHistory, RTITemplateDB, Sender } from '../types/db';

export const mockTemplates: Template[] = [
  {
    id: 'new1',
    title: 'Standard Environmental Data Request',
    description: 'Used for requesting pollution and emission data.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nI am writing to request information under the Right to Information Act regarding environmental data...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'new2',
    title: 'Budget Allocation Inquiry',
    description: 'Used for requesting departmental budget details.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nPlease provide the detailed budget allocation for the fiscal year...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Additional templates for demonstrating pagination (Page Size: 10)
  { id: 'new3', title: 'Public Works Project Details', description: 'Inquiry about ongoing construction', file: '', content: '# Project Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new4', title: 'Staff Recruitment Data', description: 'Request statistics on hiring', file: '', content: '# Recruitment Stats\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new5', title: 'Healthcare Facility Audit', description: 'Audit reports for hospitals', file: '', content: '# Healthcare Audit\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new6', title: 'Urban Planning Records', description: 'City development masterplan', file: '', content: '# Urban Planning\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new7', title: 'Educational Grant Usage', description: 'How school funds were spent', file: '', content: '# Grant Usage\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new8', title: 'Transport Department Revenue', description: 'Monthly toll collection data', file: '', content: '# Revenue Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new9', title: 'Voter Registration Logs', description: 'Anonymized registration counts', file: '', content: '# Voter Logs\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new10', title: 'Agriculture Subsidy List', description: 'Beneficiaries of seed grants', file: '', content: '# Subsidy List\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new11', title: 'Water Quality Reports', description: 'Daily turbidity and pH test result', file: '', content: '# Water Quality\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new12', title: 'Solid Waste Management Log', description: 'Tracking garbage disposal sites', file: '', content: '# Waste Log\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new13', title: 'Mining Lease Agreements', description: 'Active mining permissions list', file: '', content: '# Mining Leases\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new14', title: 'Telecom License Renewals', description: 'Inquiry on fiber optic rollout', file: '', content: '# Telecom Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new15', title: 'Police Department Vacancies', description: 'Open positions in city police', file: '', content: '# Vacancy Status\n{{date}}', createdAt: new Date(), updatedAt: new Date() }
];

// ---- DB demo data (used by demo-only pages/services)
// Keep these as in-memory arrays so swapping to API later is trivial.

export const mockPositions: Position[] = [
  { id: 'pos-1', name: 'Information Officer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'pos-2', name: 'Designated Officer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'pos-3', name: 'Secretary', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'pos-4', name: 'Director General', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockInstitutions: Institution[] = [
  { id: 'inst-1', name: 'Ministry of Health', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inst-2', name: 'Department of Education', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inst-3', name: 'Central Environmental Authority', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'inst-4', name: 'Road Development Authority', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockSenders: Sender[] = [
  { id: 'snd-1', name: 'Amal Perera', email: null, address: null, contactNo: '0771234567', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'snd-2', name: 'Bimali Silva', email: 'bimali.s@example.com', address: 'Gampaha', contactNo: '0712345678', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'snd-3', name: 'Chamara Bandara', email: 'chamara.b@example.com', address: null, contactNo: '0723456789', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockReceivers: Receiver[] = [
  {
    id: 'rcv-1',
    positionId: 'pos-1',
    institutionId: 'inst-1',
    positionName: 'Information Officer',
    institutionName: 'Ministry of Health',
    email: 'io.health@gov.lk',
    address: null,
    contactNo: '0112444555',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rcv-2',
    positionId: 'pos-2',
    institutionId: 'inst-2',
    positionName: 'Designated Officer',
    institutionName: 'Department of Education',
    email: 'do.edu@gov.lk',
    address: null,
    contactNo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rcv-3',
    positionId: 'pos-4',
    institutionId: 'inst-4',
    positionName: 'Director General',
    institutionName: 'Road Development Authority',
    email: 'dg.rda@gov.lk',
    address: 'Colombo',
    contactNo: '0112000111',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockRTITemplatesDB: RTITemplateDB[] = [
  { id: 'tmpl-1', title: 'General Request Template', description: 'Template for general information requests.', file: 'templates/general_request.pdf', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'tmpl-2', title: 'Education Data Request', description: 'Requesting education statistics.', file: 'templates/edu_data.pdf', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'tmpl-3', title: 'Infrastructure Project Details', description: 'Requesting infrastructure project info.', file: 'templates/infrastructure.pdf', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockStatuses: RTIStatus[] = [
  { id: 'st-1', name: 'SENT_FOR_APPROVAL', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'st-2', name: 'APPROVED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'st-3', name: 'REJECTED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'st-4', name: 'SENT_TO_RECEIVER', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'st-5', name: 'OTHER', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'st-6', name: 'COMPLETED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

export const mockRTIRequests: RTIRequestRow[] = [
  {
    id: 'req-1',
    title: 'Inquiry on Hospital Supplies',
    description: 'Requesting details of medicine availability.',
    senderId: 'snd-1',
    senderName: 'Amal Perera',
    receiverId: 'rcv-1',
    receiverInstitution: 'Ministry of Health',
    receiverPosition: 'Information Officer',
    rtiTemplateId: 'tmpl-1',
    rtiTemplateTitle: 'General Request Template',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'req-2',
    title: 'School Expenditure 2024',
    description: 'Requesting budget allocation for schools.',
    senderId: 'snd-2',
    senderName: 'Bimali Silva',
    receiverId: 'rcv-2',
    receiverInstitution: 'Department of Education',
    receiverPosition: 'Designated Officer',
    rtiTemplateId: 'tmpl-2',
    rtiTemplateTitle: 'Education Data Request',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockStatusHistories: RTIStatusHistory[] = [
  {
    id: 'hist-1',
    rtiRequestId: 'req-1',
    statusId: 'st-1',
    statusName: 'SENT_FOR_APPROVAL',
    direction: 'sent',
    description: 'Initial request submitted for internal approval.',
    entryTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    file: 'requests/req_001.pdf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hist-2',
    rtiRequestId: 'req-1',
    statusId: 'st-2',
    statusName: 'APPROVED',
    direction: 'sent',
    description: 'Request approved.',
    entryTime: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    file: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'hist-3',
    rtiRequestId: 'req-2',
    statusId: 'st-1',
    statusName: 'SENT_FOR_APPROVAL',
    direction: 'sent',
    description: 'Initial submission.',
    entryTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    exitTime: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
    file: 'requests/req_002_v1.pdf',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];