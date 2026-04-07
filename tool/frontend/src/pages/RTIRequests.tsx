import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Eye } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { rtiRequestsService } from '../services/rtiRequestsService';
import { Receiver, RTIRequestDetails, RTIRequestRow, RTITemplateDB, Sender } from '../types/db';

type Mode = 'create' | 'edit';

export function RTIRequests() {
  const [rows, setRows] = useState<RTIRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [viewId, setViewId] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [details, setDetails] = useState<RTIRequestDetails | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [editId, setEditId] = useState<string | null>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [templates, setTemplates] = useState<RTITemplateDB[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [useExistingTemplate, setUseExistingTemplate] = useState(true);
  const [newTemplate, setNewTemplate] = useState({ title: '', description: '', file: '' });

  const [form, setForm] = useState({
    title: '',
    description: '',
    senderId: '',
    receiverId: '',
    rtiTemplateId: ''
  });

  const load = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await rtiRequestsService.list(page, 10);
      setRows(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load RTI requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    setLookupsLoading(true);
    try {
      const [s, r, t] = await Promise.all([
        rtiRequestsService.listSenders(1, 100),
        rtiRequestsService.listReceivers(1, 100),
        rtiRequestsService.listTemplates(1, 100)
      ]);
      setSenders(s.data);
      setReceivers(r.data);
      setTemplates(t.data);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load form data');
    } finally {
      setLookupsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const openCreate = async () => {
    setMode('create');
    setEditId(null);
    setUseExistingTemplate(true);
    setNewTemplate({ title: '', description: '', file: '' });
    setForm({ title: '', description: '', senderId: '', receiverId: '', rtiTemplateId: '' });
    await loadLookups();
    setFormOpen(true);
  };

  const openEdit = async (row: RTIRequestRow) => {
    setMode('edit');
    setEditId(row.id);
    setUseExistingTemplate(true);
    setNewTemplate({ title: '', description: '', file: '' });
    setForm({
      title: row.title,
      description: row.description ?? '',
      senderId: row.senderId,
      receiverId: row.receiverId,
      rtiTemplateId: row.rtiTemplateId ?? ''
    });
    await loadLookups();
    setFormOpen(true);
  };

  const openView = async (id: string) => {
    setViewId(id);
    setDetails(null);
    setViewLoading(true);
    try {
      const d = await rtiRequestsService.details(id);
      setDetails(d);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load RTI request details');
      setViewId(null);
    } finally {
      setViewLoading(false);
    }
  };

  const formTitle = useMemo(() => (mode === 'create' ? 'New RTI Request' : 'Edit RTI Request'), [mode]);

  const receiverLabel = (r: Receiver) =>
    `${r.institutionName ?? 'Institution'} — ${r.positionName ?? 'Position'}${r.email ? ` • ${r.email}` : ''}${
      r.contactNo ? ` • ${r.contactNo}` : ''
    }`;

  const save = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      senderId: form.senderId,
      receiverId: form.receiverId,
      rtiTemplateId: form.rtiTemplateId || null
    };

    if (!payload.title) return toast.error('Title is required');
    if (!payload.senderId) return toast.error('Sender is required');
    if (!payload.receiverId) return toast.error('Receiver is required');

    try {
      let templateIdToUse = payload.rtiTemplateId;

      if (!useExistingTemplate) {
        const tPayload = {
          title: newTemplate.title.trim(),
          description: newTemplate.description.trim() || null,
          file: newTemplate.file.trim()
        };
        if (!tPayload.title) return toast.error('Template title is required');
        if (!tPayload.file) return toast.error('Template file is required');

        const created = await rtiRequestsService.createTemplate(tPayload);
        templateIdToUse = created.id;
      }

      if (mode === 'create') {
        await rtiRequestsService.create({ ...payload, rtiTemplateId: templateIdToUse });
        toast.success('RTI request created');
      } else if (editId) {
        await rtiRequestsService.update(editId, { ...payload, rtiTemplateId: templateIdToUse });
        toast.success('RTI request updated');
      }

      setFormOpen(false);
      setEditId(null);
      await load(pagination.page);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save RTI request');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await rtiRequestsService.remove(id);
      toast.success('RTI request deleted');
      const pageToFetch = rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await load(pageToFetch);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete RTI request');
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">RTI Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Create and manage RTI requests.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
          <Plus className="w-4 h-4" /> New RTI Request
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
          Request List
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading RTI requests...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No RTI requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Receiver</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3 w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 text-gray-700">{r.senderName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.receiverInstitution} — {r.receiverPosition}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.rtiTemplateTitle || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2"
                          onClick={() => openView(r.id)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="px-2" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="px-2"
                          onClick={() => setDeleteId(r.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 border-t border-gray-100 bg-gray-50/30">
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => load(p)} />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete RTI Request?"
        message="Are you sure you want to delete this RTI request? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        confirmText="Delete"
      />

      <Modal
        open={!!viewId}
        title="RTI Request Details"
        onClose={() => {
          setViewId(null);
          setDetails(null);
        }}
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setViewId(null);
              setDetails(null);
            }}
          >
            Close
          </Button>
        }
      >
        {viewLoading || !details ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading details...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Request</div>
                <div className="mt-2">
                  <div className="text-lg font-bold text-gray-900">{details.request.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{details.request.description || '-'}</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Template</div>
                <div className="mt-2">
                  <div className="text-sm font-semibold text-gray-900">{details.request.rtiTemplateTitle || '-'}</div>
                  <div className="text-sm text-gray-600 mt-1">{details.request.rtiTemplateDescription || '-'}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    File: <span className="font-mono">{details.request.rtiTemplateFile || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">{details.request.senderName}</div>
                  <div>Email: {details.request.senderEmail || '-'}</div>
                  <div>Contact No: {details.request.senderContactNo || '-'}</div>
                  <div>Address: {details.request.senderAddress || '-'}</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receiver</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">
                    {details.request.institutionName} — {details.request.positionName}
                  </div>
                  <div>Email: {details.request.receiverEmail || '-'}</div>
                  <div>Contact No: {details.request.receiverContactNo || '-'}</div>
                  <div>Address: {details.request.receiverAddress || '-'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
                Status History
              </div>
              {details.statusHistories.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">No status history records.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white">
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Direction</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Entry</th>
                        <th className="px-4 py-3">Exit</th>
                        <th className="px-4 py-3">File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {details.statusHistories.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{h.statusName}</td>
                          <td className="px-4 py-3 text-gray-700">{h.direction}</td>
                          <td className="px-4 py-3 text-gray-600">{h.description || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{new Date(h.entryTime).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600">{h.exitTime ? new Date(h.exitTime).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{h.file || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={formOpen}
        title={formTitle}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>{mode === 'create' ? 'Create RTI Request' : 'Save Changes'}</Button>
          </>
        }
      >
        {lookupsLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading form...</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</label>
                <input
                  className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  placeholder="RTI request title"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</label>
                <textarea
                  className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 min-h-[90px]"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Description (optional)"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sender ({'{{sender_name}}'})
                </label>
                <select
                  className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  value={form.senderId}
                  onChange={(e) => setForm((s) => ({ ...s, senderId: e.target.value }))}
                >
                  <option value="">Select sender</option>
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Receiver ({'{{receiver_name}}'} / {'{{receiver_position}}'})
                </label>
                <select
                  className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  value={form.receiverId}
                  onChange={(e) => setForm((s) => ({ ...s, receiverId: e.target.value }))}
                >
                  <option value="">Select receiver</option>
                  {receivers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {receiverLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">Template</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Create using an existing template or create a new DB template for this request.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={useExistingTemplate ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setUseExistingTemplate(true)}
                  >
                    Use Existing
                  </Button>
                  <Button
                    variant={!useExistingTemplate ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setUseExistingTemplate(false)}
                  >
                    Create New
                  </Button>
                </div>
              </div>

              {useExistingTemplate ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Existing Template</label>
                    <select
                      className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      value={form.rtiTemplateId}
                      onChange={(e) => setForm((s) => ({ ...s, rtiTemplateId: e.target.value }))}
                    >
                      <option value="">No template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Template Title</label>
                    <input
                      className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Template title"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Template Description</label>
                    <textarea
                      className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 min-h-[80px]"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate((s) => ({ ...s, description: e.target.value }))}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Template File</label>
                    <input
                      className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                      value={newTemplate.file}
                      onChange={(e) => setNewTemplate((s) => ({ ...s, file: e.target.value }))}
                      placeholder="e.g. templates/my_template.pdf"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is stored in the database as the template <strong>file</strong> path/string (per schema).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

