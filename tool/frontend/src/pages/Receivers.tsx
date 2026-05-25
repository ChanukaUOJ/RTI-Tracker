import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { DataTable } from '../components/DataTable';
import { TabButton } from '../components/TabButton';
import { FormLabel } from '../components/FormLabel';
import { FieldError } from '../components/FieldError';

import { receiversService } from '../services/receiversService';
import { institutionService } from '../services/institutionService';
import { positionService } from '../services/positionService';
import { Institution, Position, Receiver } from '../types/db';
import { useEntityData } from '../hooks/useEntityData';
import { Column } from '../types/table';
import { useDebounce } from '../hooks/useDebounce';

import { Regx } from "../consts/regx";
import TagInput from '../components/TagInput';

type TabKey = 'receivers' | 'institutions' | 'positions';

// define required regex
const EMAIL_RE = Regx.EMAIL;
const PHONE_RE = Regx.PHONE;

// receiver validation schema
const receiverSchema = yup.object().shape({
  institutionId: yup.string().required('Institution is required'),
  positionId: yup.string().required('Position is required'),
  emails: yup
    .array()
    .of(
      yup
        .string()
        .required()
        .matches(EMAIL_RE, 'Please enter a valid email address')
    )
    .nullable(),
  contactNos: yup
    .array()
    .of(
      yup
        .string()
        .required()
        .test('is-sl-phone', 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)', v => {
          if (!v) return true;
          return PHONE_RE.test(v);
        })
    )
    .nullable(),
  address: yup.string().nullable().transform(v => (v === '' ? null : v)),
}).test('contact-required', 'Either Email or Contact No is required', function (value) {
  const hasEmails = Array.isArray(value.emails) && value.emails.length > 0;
  const hasContactNos = Array.isArray(value.contactNos) && value.contactNos.length > 0;
  if (!hasEmails && !hasContactNos) {
    return this.createError({ path: 'emails', message: 'At least one Email or Contact No is required' });
  }
  return true;
});

const nameEntitySchema = yup.object({
  name: yup.string().required('Name is required').trim(),
});


export function Receivers() {
  const [tab, setTab] = useState<TabKey>('receivers');

  // Pagination and Search State
  const [params, setParams] = useState({
    receivers: { page: 1, pageSize: 10, search: '' },
    institutions: { page: 1, pageSize: 10, search: '' },
    positions: { page: 1, pageSize: 10, search: '' }
  });

  const debouncedReceiversSearch = useDebounce(params.receivers.search);

  // Entities Hook Instances
  const receiversHook = useEntityData<Receiver>(
    'receivers',
    {
      list: receiversService.listReceivers,
      create: receiversService.createReceiver,
      update: receiversService.updateReceiver,
      delete: receiversService.removeReceiver
    },
    params.receivers.page,
    params.receivers.pageSize,
    debouncedReceiversSearch,
    (p) => updateParams('receivers', { page: p })
  );

  const institutionsHook = useEntityData<Institution>(
    'institutions',
    {
      list: institutionService.listInstitutions,
      create: institutionService.createInstitution,
      update: institutionService.updateInstitution,
      delete: institutionService.removeInstitution
    },
    params.institutions.page,
    params.institutions.pageSize,
    params.institutions.search,
    (p) => updateParams('institutions', { page: p })
  );

  const positionsHook = useEntityData<Position>(
    'positions',
    {
      list: positionService.getPositions,
      create: positionService.createPosition,
      update: positionService.updatePosition,
      delete: positionService.removePosition
    },
    params.positions.page,
    params.positions.pageSize,
    params.positions.search,
    (p) => updateParams('positions', { page: p })
  );

  const isAnyMutating = receiversHook.isMutating || institutionsHook.isMutating || positionsHook.isMutating;

  const updateParams = (key: TabKey, updates: any) => {
    setParams(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  // Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: TabKey } | null>(null);

  // Receiver Form
  const [receiverEdit, setReceiverEdit] = useState<Receiver | null>(null);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);

  const {
    control: receiverControl,
    handleSubmit: handleReceiverSubmit,
    reset: resetReceiverForm,
    setValue: setReceiverValue,
    formState: { errors: receiverErrors }
  } = useForm<ReceiverFormValues>({
    resolver: yupResolver(receiverSchema),
    defaultValues: {
      institutionId: '',
      positionId: '',
      emails: [] as string[],
      contactNos: [] as string[],
      address: ''
    }
  });

  // Institution/Position Shared Modal State
  const [nameModal, setNameModal] = useState<{ open: boolean; edit: Institution | Position | null; type: 'institution' | 'position' }>({
    open: false, edit: null, type: 'institution'
  });

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetNameForm,
    formState: { errors: nameErrors }
  } = useForm({
    resolver: yupResolver(nameEntitySchema),
    defaultValues: { name: '' }
  });

  const [redirectType, setRedirectType] = useState<'institution' | 'position' | null>(null);

  // Column Definitions
  const receiverColumns: Column<Receiver>[] = useMemo(() => [
    { header: 'Institution', cell: (r) => r.institution?.name || '-', className: 'font-medium text-gray-900' },
    { header: 'Position', cell: (r) => r.position?.name || '-', className: 'text-gray-700' },
    {
      header: 'Emails',
      cell: (r) => r.emails?.length
        ? <div className="flex flex-wrap gap-1">
          {r.emails.map((e, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">{e}</span>
          ))}
        </div>
        : '-',
    },
    {
      header: 'Contact Nos',
      cell: (r) => r.contactNos?.length
        ? <div className="flex flex-wrap gap-1">
          {r.contactNos.map((n, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">{n}</span>
          ))}
        </div>
        : '-',
    },
    { header: 'Address', accessor: 'address', className: 'text-gray-600' },
  ], []);

  const simpleEntityColumns = useMemo(() => [
    { header: 'Name', accessor: 'name' as any, className: 'font-medium text-gray-900' }
  ], []);

  // Handlers
  const startRedirect = (type: 'institution' | 'position', name: string) => {
    setRedirectType(type);
    setNameModal({ open: true, edit: null, type });
    resetNameForm({ name: name });
    setReceiverModalOpen(false);
    setTab(type === 'institution' ? 'institutions' : 'positions');
  };

  const openReceiverModal = (r?: Receiver) => {
    setReceiverEdit(r || null);
    resetReceiverForm({
      institutionId: r?.institution?.id || '',
      positionId: r?.position?.id || '',
      emails: r?.emails || [],
      contactNos: r?.contactNos || [],
      address: r?.address || ''
    });
    setReceiverModalOpen(true);
  };

  const onSaveReceiver = async (data: ReceiverFormValues) => {
    try {
      const payload = {
        institutionId: data.institutionId,
        positionId: data.positionId,
        emails: data.emails ?? [],
        contactNos: data.contactNos?.map(n => n.replace(/-/g, '')) ?? [],
        address: data.address ?? null,
      };
      if (receiverEdit) {
        await receiversHook.confirmUpdate(receiverEdit.id, payload);
        toast.success('Receiver updated');
      } else {
        await receiversHook.confirmCreate(payload);
        toast.success('Receiver created');
      }
      setReceiverModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save receiver');
    }
  };

  const openNameModal = (type: 'institution' | 'position', item?: Institution | Position) => {
    setNameModal({ open: true, edit: item || null, type });
    resetNameForm({ name: item?.name || '' });
  };

  const onSaveNameEntity = async (formData: { name: string }) => {
    const { type, edit } = nameModal;
    const name = formData.name.trim();

    // Duplicate Validation (using existing data from hooks)
    const list = type === 'institution' ? institutionsHook.data : positionsHook.data;
    const duplicate = list.find((i: Institution | Position) => i.name.toLowerCase() === name.toLowerCase() && i.id !== edit?.id);

    if (duplicate) {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" already exists.`);
      if (!edit && redirectType === type) {
        setReceiverValue(`${type}Id` as any, duplicate.id);
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setRedirectType(null);
      return;
    }

    try {
      let res: any;
      if (type === 'institution') {
        if (edit) res = await institutionsHook.confirmUpdate(edit.id, { name });
        else res = await institutionsHook.confirmCreate({ name });
      } else {
        if (edit) res = await positionsHook.confirmUpdate(edit.id, { name });
        else res = await positionsHook.confirmCreate({ name });
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${edit ? 'updated' : 'created'}`);

      if (!edit && redirectType === type && res) {
        setReceiverValue(`${type}Id` as any, res.id);
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setRedirectType(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || `Failed to save ${type}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    const hook = type === 'receivers' ? receiversHook : (type === 'institutions' ? institutionsHook : positionsHook);
    setDeleteConfirm(null);
    try {
      await hook.confirmDelete(id);
      toast.success(`${type.slice(0, -1)} deleted`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || `Failed to delete ${type.slice(0, -1)}`);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900">Receivers</h1>
        <p className="text-xs text-gray-600">Manage receivers, institutions and positions.</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {(['receivers', 'institutions', 'positions'] as TabKey[]).map(t => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </TabButton>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {tab === 'receivers' && (
          <DataTable
            title="Receiver"
            onAdd={() => openReceiverModal()}
            {...receiversHook}
            loading={receiversHook.isLoading || receiversHook.isFetching || isAnyMutating}
            onPageChange={p => updateParams('receivers', { page: p })}
            onPageSizeChange={s => updateParams('receivers', { pageSize: s, page: 1 })}
            searchTerm={params.receivers.search}
            onSearch={s => updateParams('receivers', { search: s, page: 1 })}
            columns={receiverColumns}
            onEdit={openReceiverModal}
            onDelete={r => setDeleteConfirm({ id: r.id, type: 'receivers' })}
          />
        )}

        {(tab === 'institutions' || tab === 'positions') && (
          <DataTable
            title={tab === 'institutions' ? 'Institution' : 'Position'}
            onAdd={() => openNameModal(tab === 'institutions' ? 'institution' : 'position')}
            {...(tab === 'institutions' ? institutionsHook : positionsHook)}
            loading={(tab === 'institutions' ? (institutionsHook.isLoading || institutionsHook.isFetching) : (positionsHook.isLoading || positionsHook.isFetching)) || isAnyMutating}
            onPageChange={p => updateParams(tab, { page: p })}
            onPageSizeChange={s => updateParams(tab, { pageSize: s, page: 1 })}
            columns={simpleEntityColumns}
            onEdit={item => openNameModal(tab === 'institutions' ? 'institution' : 'position', item)}
            onDelete={(item: Institution | Position) => setDeleteConfirm({ id: item.id, type: tab })}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type.slice(0, -1)}?`}
        message={`Are you sure you want to delete this ${deleteConfirm?.type.slice(0, -1)}?`}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        confirmText={isAnyMutating ? "Deleting..." : "Delete"}
      />

      <Modal
        open={receiverModalOpen}
        title={receiverEdit ? 'Edit Receiver' : 'New Receiver'}
        onClose={() => setReceiverModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiverModalOpen(false)} disabled={isAnyMutating}>Cancel</Button>
            <Button onClick={handleReceiverSubmit(onSaveReceiver)} disabled={isAnyMutating}>
              {isAnyMutating ? 'Saving...' : (receiverEdit ? 'Save Changes' : 'Create Receiver')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Institution" required />
            <Controller
              name="institutionId"
              control={receiverControl}
              render={({ field }) => (
                <SearchableSelect
                  placeholder="Select institution"
                  value={field.value}
                  onChange={field.onChange}
                  options={institutionsHook.data}
                  onAddSpecial={n => startRedirect('institution', n)}
                  addLabel="Add Institution"
                />
              )}
            />
            <FieldError error={receiverErrors.institutionId?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Position" required />
            <Controller
              name="positionId"
              control={receiverControl}
              render={({ field }) => (
                <SearchableSelect
                  placeholder="Select position"
                  value={field.value}
                  onChange={field.onChange}
                  options={positionsHook.data}
                  onAddSpecial={n => startRedirect('position', n)}
                  addLabel="Add Position"
                />
              )}
            />
            <FieldError error={receiverErrors.positionId?.message} />
          </div>

          {/* Emails — full width */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <FormLabel label="Emails" />
            <p className="text-xs text-gray-400 -mt-1">Type an email and press <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">Enter</kbd> or <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">,</kbd> to add. Paste comma-separated emails to add multiple at once.</p>
            <Controller
              name="emails"
              control={receiverControl}
              render={({ field }) => (
                <TagInput
                  tags={(field.value as string[]) || []}
                  onChange={field.onChange}
                  validator={v => EMAIL_RE.test(v)}
                  validationMessage="Please enter a valid email address"
                  placeholder="receiver@example.com"
                  hasError={!!receiverErrors.emails}
                  type="email"
                />
              )}
            />
            <FieldError error={receiverErrors.emails?.message as string} />
          </div>

          {/* Contact Nos — full width */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <FormLabel label="Contact Numbers" />
            <p className="text-xs text-gray-400 -mt-1">Type a number and press <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">Enter</kbd> or <kbd className="px-1 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">,</kbd> to add.</p>
            <Controller
              name="contactNos"
              control={receiverControl}
              render={({ field }) => (
                <TagInput
                  tags={(field.value as string[]) || []}
                  onChange={field.onChange}
                  validator={v => PHONE_RE.test(v)}
                  validationMessage="Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)"
                  placeholder="0xxxxxxxx or +94xxxxxxxxx"
                  hasError={!!receiverErrors.contactNos}
                  type="tel"
                />
              )}
            />
            <FieldError error={receiverErrors.contactNos?.message as string} />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <FormLabel label="Address" />
            <Controller
              name="address"
              control={receiverControl}
              render={({ field }) => (
                <input
                  autoComplete="off"
                  className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${receiverErrors.address ? 'border-red-500' : ''}`}
                  {...field}
                  value={field.value || ''}
                  placeholder="Address (optional)"
                />
              )}
            />
            <FieldError error={receiverErrors.address?.message} />
          </div>
        </div>
      </Modal>

      <Modal
        open={nameModal.open}
        title={`${nameModal.edit ? 'Edit' : 'New'} ${nameModal.type}`}
        onClose={() => setNameModal(s => ({ ...s, open: false }))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNameModal(s => ({ ...s, open: false }))} disabled={isAnyMutating}>Cancel</Button>
            <Button onClick={handleNameSubmit(onSaveNameEntity)} disabled={isAnyMutating}>
              {isAnyMutating ? 'Saving...' : (nameModal.edit ? 'Save Changes' : 'Create')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Name" required />
          <input
            className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${nameErrors.name ? 'border-red-500' : ''}`}
            {...registerName('name')}
            placeholder="Name"
          />
          <FieldError error={nameErrors.name?.message} />
        </div>
      </Modal>
    </div>
  );
}