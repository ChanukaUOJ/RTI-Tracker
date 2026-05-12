import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStatuses } from '../hooks/useStatuses';
import { RTIStatus } from '../types/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldError } from '../components/FieldError';
import { Column } from '../types/table';

export function Statuses() {
  const [pageParams, setPageParams] = useState({ page: 1, pageSize: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RTIStatus | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const [showErrors, setShowErrors] = useState(false);

  const {
    data: response,
    isLoading,
    isFetching,
    createStatus,
    updateStatus,
    deleteStatus,
    isCreating,
    isUpdating,
    isDeleting
  } = useStatuses(
    pageParams.page,
    pageParams.pageSize,
    undefined,
    (newPage) => setPageParams(prev => ({ ...prev, page: newPage }))
  );

  const data = response?.data || [];
  const pagination = response?.pagination;


  const handleOpenModal = (item?: RTIStatus) => {
    if (item) {
      setEditingItem(item);
      setFormData({ id: item.id, name: item.name });
    } else {
      setEditingItem(null);
      setFormData({ id: '', name: '' });
    }
    setShowErrors(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setShowErrors(true);
      return;
    }

    try {
      if (editingItem) {
        await updateStatus({ id: editingItem.id, payload: { ...formData, name: trimmedName } });
        toast.success('Status updated successfully');
      } else {
        await createStatus({ ...formData, name: trimmedName });
        toast.success('Status created successfully');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStatus(deleteId);
      toast.success('Status deleted successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete status');
    } finally {
      setDeleteId(null);
    }
  };


  const columns: Column<RTIStatus>[] = [
    {
      header: 'Name',
      accessor: 'name',
      className: 'font-medium text-gray-900'
    }
  ];

  return (
    <div className="flex flex-col space-y-4">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900">Statuses</h1>
        <p className="text-xs text-gray-600">Manage RTI request lifecycle statuses.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <DataTable
          title="Status"
          onAdd={() => handleOpenModal()}
          data={data}
          columns={columns}
          loading={isLoading || isFetching || isCreating || isUpdating || isDeleting}
          pagination={pagination}
          onPageChange={(p) => setPageParams(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(size) => setPageParams(prev => ({ ...prev, page: 1, pageSize: size }))}
          onEdit={handleOpenModal}
          onDelete={(item) => setDeleteId(item.id)}
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Status' : 'Add Status'}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Input
              label="Status Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="e.g. IN REVIEW"
              className="uppercase"
            />
            {showErrors && !formData.name.trim() && <FieldError error="Name is required" />}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={isCreating || isUpdating}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Status?"
        message="Are you sure you want to delete this status? If this status is used in existing history events, they might not display correctly."
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </div>
  );
}

