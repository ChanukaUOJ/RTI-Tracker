import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { useSenders } from "../hooks/useSenders";
import { Column } from "../types/table";
import { Sender } from "../types/db";
import toast from "react-hot-toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { FieldError } from "../components/FieldError";
import { Button } from "../components/Button";
import { FormLabel } from "../components/FormLabel";
import { Controller, useForm } from "react-hook-form";
import * as yup from 'yup';
import { yupResolver } from "@hookform/resolvers/yup";

// sender form schema
const senderSchema = yup.object().shape({
    name: yup.string().required('Sender name is required'),
    email: yup.string().trim().nullable().transform(v => v === '' ? null : v)
        .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'),
    contactNo: yup.string().trim().nullable().transform(v => v === '' ? null : v)
        .test('is-sl-phone', 'Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)', value => {
            if (!value) return true;
            return /^(?:\+94|0)\d{9}$/.test(value);
        }),
    address: yup.string().nullable().transform(v => v === '' ? null : v),
}).test('contact-required', 'Either Email or Contact No is required', function (value) {
    if (!value.email && !value.contactNo) {
        return this.createError({ path: 'email', message: 'Email or Contact No is required' });
    }
    return true;
});

export function Senders() {
    const [pageParams, setPageParams] = useState({ page: 1, pageSize: 10 });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [senderEdit, setSenderEdit] = useState<Sender | null>();

    const {
        data: response,
        isLoading,
        isFetching,
        createSender,
        updateSender,
        deleteSender,
        isCreating,
        isUpdating,
        isDeleting
    } = useSenders(
        pageParams.page,
        pageParams.pageSize,
        (newPage) => setPageParams(prev => ({ ...prev, page: newPage }))
    )

    const data = response?.data || []
    const pagination = response?.pagination || {}
    const isAnyMutating = (isCreating || isUpdating) || false

    const {
        control: senderControl,
        handleSubmit: handleSubmit,
        reset: resetForm,
        formState: { errors: senderErrors }
    } = useForm({
        resolver: yupResolver(senderSchema),
        defaultValues: {
            name: '', email: '', contactNo: '', address: ''
        }
    });

    const handleOpenModal = (s?: Sender) => {
        setSenderEdit(s || null);
        resetForm({
            name: s?.name || '',
            email: s?.email || '',
            address: s?.address || '',
            contactNo: s?.contactNo || ''
        });
        setIsModalOpen(true);
    }

    const onSaveSender = async (data: Partial<Sender>) => {
        try {
            if (senderEdit) {
                await updateSender({ id: senderEdit.id, payload: data });
                toast.success('Sender updated');
            } else {
                await createSender(data);
                toast.success('Sender created');
            }
            setIsModalOpen(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save sender');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteSender(deleteId);
            toast.success('Sender deleted successfully');
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete sender');
        } finally {
            setDeleteId(null);
        }
    };

    const columns: Column<Sender>[] = [
        {
            header: 'Name',
            accessor: 'name',
            className: 'font-medium text-gray-900'
        },
        {
            header: 'Email',
            accessor: 'email'
        },
        {
            header: 'Address',
            accessor: 'address'
        },
        {
            header: 'Contact No',
            accessor: 'contactNo'
        }
    ];

    return (<div className="flex flex-col space-y-2">
        <div className="mb-1">
            <h1 className="text-xl font-bold text-gray-900">Senders</h1>
            <p className="text-xs text-gray-600">Manage RTI Senders</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <DataTable
                title="Sender"
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
            title={senderEdit ? 'Update Sender' : 'New Sender'}
            onClose={() => setIsModalOpen(false)}
            footer={
                <>
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isAnyMutating}>Cancel</Button>
                    <Button onClick={handleSubmit(onSaveSender)} disabled={isAnyMutating}>
                        {isAnyMutating ? 'Saving...' : (senderEdit ? 'Save Changes' : 'Create Sender')}
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <FormLabel label="Name" required />
                    <Controller
                        name="name"
                        control={senderControl}
                        render={({ field }) => (
                            <input
                                type="text"
                                autoComplete="off"
                                className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${senderErrors.name ? 'border-red-500' : ''}`}
                                {...field}
                                value={field.value || ''}
                                placeholder="Sender name example"
                            />
                        )}
                    />
                    <FieldError error={senderErrors.name?.message} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <FormLabel label="Email" required />
                    <Controller
                        name="email"
                        control={senderControl}
                        render={({ field }) => (
                            <input
                                type="email"
                                autoComplete="off"
                                className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${senderErrors.email ? 'border-red-500' : ''}`}
                                {...field}
                                value={field.value || ''}
                                placeholder="sender@example.com"
                            />
                        )}
                    />
                    <FieldError error={senderErrors.email?.message} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <FormLabel label="Contact No" />
                    <Controller
                        name="contactNo"
                        control={senderControl}
                        render={({ field }) => (
                            <input
                                autoComplete="off"
                                className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${senderErrors.contactNo ? 'border-red-500' : ''}`}
                                {...field}
                                value={field.value || ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9+]/g, '');
                                    const sanitized = val.replace(/(?!^)\+/g, '');
                                    field.onChange(sanitized);
                                }}
                                placeholder="0xxxxxxxx or +94xxxxxxxxx"
                            />
                        )}
                    />
                    <FieldError error={senderErrors.contactNo?.message} />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                    <FormLabel label="Address" />
                    <Controller
                        name="address"
                        control={senderControl}
                        render={({ field }) => (
                            <input
                                autoComplete="off"
                                className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${senderErrors.address ? 'border-red-500' : ''}`}
                                {...field}
                                value={field.value || ''}
                                placeholder="Address (optional)"
                            />
                        )}
                    />
                    <FieldError error={senderErrors.address?.message} />
                </div>
            </div>
        </Modal>

        <ConfirmDialog
            open={!!deleteId}
            title="Delete Sender?"
            message="Are you sure you want to delete this sender? This action cannot be undone."
            onCancel={() => setDeleteId(null)}
            onConfirm={handleDelete}
            confirmText={isDeleting ? "Deleting..." : "Delete"}
        />
    </div>);

}