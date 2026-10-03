import { useState } from 'react';
import {
  PlusIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ArrowRightCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';
import { useEvent } from '../../contexts/EventContext';

const emptyForm = {
  name: '',
  description: '',
  venue: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const formatDateRange = (start, end) => {
  if (!start && !end) return 'No dates set';
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
};

export const EventFormModal = ({ initial, onClose, onSubmit }) => {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(initial?.id);

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Event name is required');
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('End date cannot be before start date');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        venue: form.venue.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (isEdit) payload.isActive = form.isActive;
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit event' : 'Create event'}</h3>
            {!isEdit && (
              <p className="mt-1 text-sm text-gray-500">
                All chapels and chapel leaders are copied in from Homecoming automatically. After creating it,
                open it and upload its members and sessions.
              </p>
            )}
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="e.g. Word Conference 2026"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={update('description')}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Venue</label>
              <input
                type="text"
                value={form.venue}
                onChange={update('venue')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={update('startDate')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={update('endDate')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={update('isActive')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Active (chapel leaders can only sign in to active events)
              </label>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EventsPage = () => {
  const { userType } = useAuth();
  const { showSuccess, showError } = useApp();
  const { events, currentEventId, selectEvent, createEvent, updateEvent, syncEventChapels, loading } = useEvent();
  const [modal, setModal] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const isAdmin = userType === 'admin';

  const handleCreate = async (payload) => {
    const response = await createEvent(payload);
    showSuccess(response?.message || `Event "${payload.name}" created`);
  };

  const handleSync = async (event) => {
    setSyncingId(event.id);
    try {
      const response = await syncEventChapels(event.id);
      showSuccess(response?.message || 'Chapels and chapel leaders synced');
    } catch (err) {
      showError?.(err.message || 'Failed to sync chapels');
    } finally {
      setSyncingId(null);
    }
  };

  const handleUpdate = (id) => async (payload) => {
    await updateEvent(id, payload);
    showSuccess('Event updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-600">
            Each event has its own members, chapels and sessions. Use the selector in the header to switch between them.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5" />
            New event
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No events yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const isCurrent = event.id === currentEventId;
            const counts = event._count || {};
            return (
              <div
                key={event.id}
                className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm ${
                  isCurrent ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-500">{formatDateRange(event.startDate, event.endDate)}</p>
                    {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        <CheckCircleIcon className="h-4 w-4" /> Current
                      </span>
                    )}
                    {!event.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                    )}
                    {event.hasChariots && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Chariots</span>
                    )}
                  </div>
                </div>

                {event.description && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{event.description}</p>}

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Members', counts.members],
                    ['Chapels', counts.chapels],
                    ['Sessions', counts.sessions],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-gray-50 py-2">
                      <dt className="text-xs text-gray-500">{label}</dt>
                      <dd className="text-lg font-semibold text-gray-900">{value ?? 0}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex gap-2">
                  {!isCurrent && (
                    <button
                      onClick={() => selectEvent(event.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      <ArrowRightCircleIcon className="h-4 w-4" />
                      Open
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() =>
                        setModal({
                          mode: 'edit',
                          event: {
                            id: event.id,
                            name: event.name,
                            description: event.description || '',
                            venue: event.venue || '',
                            startDate: toDateInput(event.startDate),
                            endDate: toDateInput(event.endDate),
                            isActive: event.isActive,
                          },
                        })
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>
                {isAdmin && event.slug !== 'homecoming' && (
                  <button
                    onClick={() => handleSync(event)}
                    disabled={syncingId === event.id}
                    className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${syncingId === event.id ? 'animate-spin' : ''}`} />
                    {syncingId === event.id ? 'Syncing…' : 'Sync chapels & leaders from Homecoming'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <EventFormModal
          initial={modal.mode === 'edit' ? modal.event : null}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === 'edit' ? handleUpdate(modal.event.id) : handleCreate}
        />
      )}
    </div>
  );
};

export default EventsPage;
