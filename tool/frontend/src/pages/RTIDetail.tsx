import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, CheckCircle, Upload, Clock, Building2, Mail, X, Plus, Edit2, AlertTriangle, MapPin, Phone } from 'lucide-react';
import { useRTIRequestDetail } from '../hooks/useRTIRequest';
import { useRtiRequestHistories, useCreateRtiRequestHistory, useUpdateRtiRequestHistory, useDeleteRtiRequestHistory } from '../hooks/useRtiRequestHistory';
import { useStatuses } from '../hooks/useStatuses';
import { RTIStatusHistory, RTIStatus } from '../types/db';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { config } from '../config';

const FILE_VIEW_BASE_URL = config.FILE_VIEW_BASE_URL;

export function RTIDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // TanStack Hooks
  const { data: request, isLoading: isRequestLoading, error: requestError } = useRTIRequestDetail(id || '');
  const { data: historyResponse, isLoading: isHistoryLoading } = useRtiRequestHistories(id || '');

  const { data: statusesResponse, isLoading: isStatusesLoading } = useStatuses(1, 100);
  const statuses: RTIStatus[] = statusesResponse?.data || [];

  const createHistoryMutation = useCreateRtiRequestHistory();
  const updateHistoryMutation = useUpdateRtiRequestHistory();
  const deleteHistoryMutation = useDeleteRtiRequestHistory();

  const history = (historyResponse?.data || [])

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RTIStatusHistory | null>(null);
  const [eventFormData, setEventFormData] = useState({
    statusId: '',
    direction: 'sent' as 'sent' | 'received',
    entryTime: '',
    exitTime: '',
    description: '',
    existingFiles: [] as string[],
    newFiles: [] as File[]
  });

  // Helper function to format date for datetime-local input
  const formatForInput = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);


  useEffect(() => {
    if (requestError) {
      toast.error('Failed to load RTI details');
      navigate('/rti-requests');
    }
  }, [requestError, navigate]);



  const handleAddEvent = () => {
    setIsEditing(false);
    setSelectedEntry(null);
    setEventFormData({
      statusId: '',
      direction: 'sent',
      entryTime: formatForInput(new Date()),
      exitTime: '',
      description: '',
      existingFiles: [],
      newFiles: []
    });
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (entry: RTIStatusHistory) => {
    setIsEditing(true);
    setSelectedEntry(entry);
    setEventFormData({
      statusId: entry.rtiStatus.id,
      direction: entry.direction as any,
      entryTime: formatForInput(entry.entryTime),
      exitTime: formatForInput(entry.exitTime),
      description: entry.description || '',
      existingFiles: entry.files,
      newFiles: []
    });
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Validation: Require at least one document except for COMPLETED
    // const totalFiles = eventFormData.existingFiles.length + eventFormData.newFiles.length;
    const selectedStatusToSave = statuses.find(s => s.id === eventFormData.statusId);
    if (!selectedStatusToSave) {
      toast.error('Please select a status');
      return;
    }

    try {
      if (isEditing && selectedEntry) {
        const filesToDelete = selectedEntry.files.filter(f => !eventFormData.existingFiles.includes(f));

        await updateHistoryMutation.mutateAsync({
          rtiRequestId: id,
          historyId: selectedEntry.id,
          payload: {
            statusId: selectedStatusToSave.id,
            direction: eventFormData.direction,
            entryTime: eventFormData.entryTime ? new Date(eventFormData.entryTime) : undefined,
            exitTime: eventFormData.exitTime ? new Date(eventFormData.exitTime) : undefined,
            description: eventFormData.description,
            filesToAdd: eventFormData.newFiles,
            filesToDelete: filesToDelete
          }
        });
        toast.success('Event updated');
      } else {
        await createHistoryMutation.mutateAsync({
          rtiRequestId: id,
          payload: {
            statusId: selectedStatusToSave.id,
            direction: eventFormData.direction,
            entryTime: eventFormData.entryTime ? new Date(eventFormData.entryTime) : undefined,
            exitTime: eventFormData.exitTime ? new Date(eventFormData.exitTime) : undefined,
            description: eventFormData.description,
            files: eventFormData.newFiles
          }
        });
        toast.success('Event added');
      }
      setIsEventModalOpen(false);
    } catch (e) {
    }
  };

  const handleDeleteEntry = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!selectedEntry || !id) return;

    try {
      await deleteHistoryMutation.mutateAsync({
        rtiRequestId: id,
        historyId: selectedEntry.id
      });
      toast.success('Event deleted');
      setIsDeleteConfirmOpen(false);
      setIsEventModalOpen(false);
    } catch (e) {
    }
  };

  const completedStatus = statuses.find(s => s.name.toLowerCase() === 'completed');
  const isCompleted = completedStatus && history.some(h => h.rtiStatus.id === completedStatus.id);

  const handleMarkCompleted = async () => {
    if (!id || !completedStatus) return;
    try {
      await createHistoryMutation.mutateAsync({
        rtiRequestId: id,
        payload: {
          statusId: completedStatus.id,
          direction: 'received',
          description: 'Request marked as completed.',
          files: []
        }
      });
      toast.success('Marked as Completed');
    } catch (e) {
    }
  };

  if (isRequestLoading || isHistoryLoading || isStatusesLoading || !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        <p className="text-gray-500 font-medium">Loading RTI details...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-full mx-auto space-y-3 pb-12">
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/rti-requests')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-900 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to RTI Requests
          </button>

          <div className="flex gap-3">
            {!isCompleted && completedStatus && (
              <Button variant="primary" className="flex items-center gap-2 bg-blue-900" onClick={handleMarkCompleted}>
                <CheckCircle className="w-4 h-4" /> Mark as Completed
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Left Columns: Core Info */}
          <div className="space-y-4">

            {/* Overview */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1">{request?.title}</h1>
                <p className="text-gray-600 leading-relaxed text-xs">
                  {request?.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t pt-2 border-gray-50">
                {/* Target Entity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Entity</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p data-testid="receiver-institution" className="text-sm font-bold text-gray-900">{request?.receiver?.institution.name}</p>
                        <p data-testid="receiver-position" className="text-xs text-gray-500">{request?.receiver?.position.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      {request?.receiver?.address ? (
                        <p data-testid="receiver-address" className="text-xs text-gray-500 leading-relaxed font-semibold">{request?.receiver?.address}</p>
                      ) : (
                        <p className="text-xs font-semibold text-gray-600">No address</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {request?.receiver?.email ? (
                        <a
                          href={`mailto:${request.receiver.email}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {request.receiver.email}
                        </a>
                      ) : (
                        <p className="text-xs font-semibold text-gray-600">No email address</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p data-testid="receiver-contactNo" className="text-sm font-semibold text-gray-900">
                        {request?.receiver?.contactNo || 'No contact number'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Template Information</h3>
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{request?.rtiTemplate?.title || 'No template'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-900" />
                  Progress Timeline
                </h2>
                <Button size="sm" variant="outline" className="text-xs flex items-center gap-1" onClick={handleAddEvent}>
                  <Plus className="w-3 h-3" /> Add Event
                </Button>
              </div>
              <div className="p-6">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                    <Clock className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No events logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {history.map((h, idx) => (
                      <div key={h.id} className="relative pl-8 group">
                        {/* Line */}
                        {idx !== history.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-32px] w-[2px] bg-gray-100 group-hover:bg-blue-100 transition-colors" />
                        )}

                        {/* Dot */}
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-900 flex items-center justify-center z-10 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-900" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold">
                                {h.rtiStatus ? (
                                  <span className="text-gray-900">{h.rtiStatus.name}</span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-gray-400 italic text-sm font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                                    Error loading status
                                  </span>
                                )}
                              </h4>
                              {idx === 0 && h.rtiStatus?.name !== 'CREATED' && (
                                <button
                                  onClick={() => handleEditEvent(h)}
                                  className="p-1 text-gray-400 hover:text-blue-900 transition-colors"
                                  title="Edit latest event"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] font-medium text-gray-400">Start: {new Date(h.entryTime).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                              {h.exitTime ? (
                                <span className="text-[10px] font-medium text-gray-400">End: {new Date(h.exitTime).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                              ) : idx === 0 ? (
                                <span className="text-[10px] font-medium text-blue-400 italic">Active</span>
                              ) : h.rtiStatus?.name !== 'CREATED' ? (
                                <span className="text-[10px] font-medium text-gray-400">End: -</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest border ${h.direction === 'sent' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                              {h.direction}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 leading-relaxed">{h.description || 'No additional details provided.'}</p>

                          {h.files && h.files.length > 0 && (
                            <div className="pt-3 space-y-2">
                              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachments</h5>
                              <div className="flex flex-wrap gap-2">
                                {h.files.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.startsWith('http') ? file : `${FILE_VIEW_BASE_URL}${file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:border-blue-300 hover:bg-blue-50/50 transition-all group cursor-pointer"
                                  >
                                    <FileText className="w-3 h-3 text-blue-900" />
                                    <span className="text-[10px] font-bold">
                                      {`File ${fIdx + 1}`}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Latest Event' : 'Add New Timeline Event'}</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <select
                  required
                  value={eventFormData.statusId}
                  onChange={(e) => {
                    const statusId = e.target.value;
                    let direction = eventFormData.direction;

                    setEventFormData({ ...eventFormData, statusId, direction });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 transition-colors"
                >
                  <option value="">Select Status</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direction</label>
                <div className="flex gap-4">
                  {['sent', 'received'].map((dir) => {
                    return (
                      <label key={dir} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          className="sr-only peer"
                          name="direction"
                          value={dir}
                          checked={eventFormData.direction === dir}
                          onChange={() => setEventFormData({ ...eventFormData, direction: dir as any })}
                        />
                        <div className="text-center py-2 text-xs font-bold uppercase tracking-widest border-2 rounded-xl border-gray-100 text-gray-400 peer-checked:border-blue-900 peer-checked:text-blue-900 peer-checked:bg-blue-50 transition-all capitalize">
                          {dir}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Time</label>
                  <input
                    type="date"
                    required
                    value={eventFormData.entryTime}
                    onChange={(e) => setEventFormData({ ...eventFormData, entryTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Time (Optional)</label>
                  <input
                    type="date"
                    value={eventFormData.exitTime}
                    onChange={(e) => setEventFormData({ ...eventFormData, exitTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="Describe this event (optional)..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 min-h-[100px] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments (PDF)</label>
                <div className="flex flex-col gap-2">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEventFormData({ ...eventFormData, newFiles: [...eventFormData.newFiles, ...files] });
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit flex items-center gap-2 text-xs border-dashed border-2 hover:border-blue-900 hover:text-blue-900"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-3.3 h-3.3" /> Select Documents
                  </Button>

                  {/* Chips for Existing and New Files */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Existing Files */}
                    {eventFormData.existingFiles.map((_, i) => (
                      <div key={`exist-${i}`} className="flex items-center gap-1.5 text-[10px] bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg text-blue-700 font-bold group">
                        <FileText className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{`File ${i + 1}.pdf`}</span>
                        <button
                          type="button"
                          onClick={() => setEventFormData({
                            ...eventFormData,
                            existingFiles: eventFormData.existingFiles.filter((_, idx) => idx !== i)
                          })}
                          className="text-blue-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {/* New Files */}
                    {eventFormData.newFiles.map((f, i) => (
                      <div key={`new-${i}`} className="flex items-center gap-1.5 text-[10px] bg-green-50 border border-green-100 px-2 py-1 rounded-lg text-green-700 font-bold group">
                        <Upload className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setEventFormData({
                            ...eventFormData,
                            newFiles: eventFormData.newFiles.filter((_, idx) => idx !== i)
                          })}
                          className="text-green-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    fullWidth
                    type="submit"
                    className="bg-blue-900"
                    loading={createHistoryMutation.isPending || updateHistoryMutation.isPending}
                  >
                    {isEditing ? 'Update Event' : 'Add Event'}
                  </Button>
                </div>
                {isEditing && (
                  <Button
                    variant="danger"
                    fullWidth
                    type="button"
                    className="mt-2 text-xs font-bold"
                    onClick={handleDeleteEntry}
                    loading={deleteHistoryMutation.isPending}
                  >
                    Delete Entry
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Delete Timeline Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={confirmDeleteEntry}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        confirmText="Delete Event"
        variant="danger"
        loading={deleteHistoryMutation.isPending}
      />
    </>
  );
}
