import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { statusService } from '../services/statusService';
import { RTIStatus } from '../types/db';

export function Status() {
  const [rows, setRows] = useState<RTIStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<RTIStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');

  const load = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await statusService.list(page, 10);
      setRows(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load statuses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const isEditing = !!editRow;
  const modalTitle = useMemo(() => (isEditing ? 'Edit Status' : 'New Status'), [isEditing]);

  const openCreate = () => {
    setEditRow(null);
    setName('');
    setIsModalOpen(true);
  };

  const openEdit = (row: RTIStatus) => {
    setEditRow(row);
    setName(row.name);
    setIsModalOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name is required');
      return;
    }
    try {
      if (editRow) {
        await statusService.update(editRow.id, { name: trimmed });
        toast.success('Status updated');
      } else {
        await statusService.create({ name: trimmed });
        toast.success('Status created');
      }
      setIsModalOpen(false);
      setEditRow(null);
      await load(pagination.page);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save status');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await statusService.remove(id);
      toast.success('Status deleted');
      const pageToFetch = rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await load(pageToFetch);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete status');
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">Status</h1>
          <p className="text-sm text-gray-600 mt-1">Manage RTI statuses.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
          <Plus className="w-4 h-4" /> New Status
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
          Status List
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading statuses...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">No statuses found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
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
        title="Delete Status?"
        message="Are you sure you want to delete this status? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        confirmText="Delete"
      />

      <Modal
        open={isModalOpen}
        title={modalTitle}
        onClose={() => {
          setIsModalOpen(false);
          setEditRow(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditRow(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save}>{isEditing ? 'Save Changes' : 'Create Status'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
          <input
            className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SENT_FOR_APPROVAL"
          />
        </div>
      </Modal>
    </div>
  );
}

