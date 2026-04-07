import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { sendersService } from '../services/sendersService';
import { Sender } from '../types/db';

export function Senders() {
  const [rows, setRows] = useState<Sender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Sender | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', address: '', contactNo: '' });

  const resetForm = () => setForm({ name: '', email: '', address: '', contactNo: '' });

  const load = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await sendersService.list(page, 10);
      setRows(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load senders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const isEditing = !!editRow;
  const modalTitle = useMemo(() => (isEditing ? 'Edit Sender' : 'New Sender'), [isEditing]);

  const openCreate = () => {
    setEditRow(null);
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (row: Sender) => {
    setEditRow(row);
    setForm({
      name: row.name ?? '',
      email: row.email ?? '',
      address: row.address ?? '',
      contactNo: row.contactNo ?? ''
    });
    setIsCreateOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        contactNo: form.contactNo.trim() || null
      };

      if (!payload.name) {
        toast.error('Name is required');
        return;
      }
      if (!payload.email && !payload.contactNo) {
        toast.error('Email or Contact No is required');
        return;
      }

      if (editRow) {
        await sendersService.update(editRow.id, payload);
        toast.success('Sender updated');
      } else {
        await sendersService.create(payload);
        toast.success('Sender created');
      }

      setIsCreateOpen(false);
      setEditRow(null);
      resetForm();
      await load(pagination.page);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save sender');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await sendersService.remove(id);
      toast.success('Sender deleted');
      const pageToFetch = rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await load(pageToFetch);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete sender');
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">Senders</h1>
          <p className="text-sm text-gray-600 mt-1">Manage senders used for RTI requests.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
          <Plus className="w-4 h-4" /> New Sender
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
          Sender List
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading senders...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No senders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Contact No</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.contactNo || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.address || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
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
        title="Delete Sender?"
        message="Are you sure you want to delete this sender? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        confirmText="Delete"
      />

      <Modal
        open={isCreateOpen}
        title={modalTitle}
        onClose={() => {
          setIsCreateOpen(false);
          setEditRow(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditRow(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>{isEditing ? 'Save Changes' : 'Create Sender'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Sender name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="sender@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact No</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={form.contactNo}
              onChange={(e) => setForm((s) => ({ ...s, contactNo: e.target.value }))}
              placeholder="Phone number"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Address (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500">
              Note: Per database rules, at least one of <strong>Email</strong> or <strong>Contact No</strong> must be
              provided.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

