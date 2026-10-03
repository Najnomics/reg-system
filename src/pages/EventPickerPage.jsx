import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  PlusIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/SimpleAppContext';
import { useEvent } from '../contexts/EventContext';
import { EventFormModal } from './admin/EventsPage';

const STAFF_ROLES = ['admin', 'reg-rep', 'pastoral'];
const SUGGESTED_EVENTS = ['Word Conference'];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const formatDateRange = (start, end) => {
  if (!start && !end) return null;
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
};

const EventPickerPage = () => {
  const { user, userType, logout, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useApp();
  const { events, loading, selectEvent, createEvent, updateEvent, syncEventChapels } = useEvent();
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [opening, setOpening] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const isAdmin = userType === 'admin';

  if (isAuthenticated && !STAFF_ROLES.includes(userType)) {
    return <Navigate to="/chariot/dashboard" replace />;
  }

  const existingNames = new Set(events.map((e) => e.name.trim().toLowerCase()));
  const suggestions = SUGGESTED_EVENTS.filter((name) => !existingNames.has(name.toLowerCase()));

  const openEvent = async (event) => {
    setOpening(event.id);
    try {
      await selectEvent(event.id, '/admin/dashboard');
    } catch (err) {
      showError(err.message || 'Could not open event');
      setOpening(null);
    }
  };

  const handleCreate = async (payload) => {
    const response = await createEvent(payload);
    showSuccess(response?.message || `Event "${payload.name}" created`);
  };

  const handleUpdate = async (payload) => {
    await updateEvent(editing.id, payload);
    showSuccess('Event updated');
  };

  const handleSync = async (event) => {
    setSyncingId(event.id);
    try {
      const response = await syncEventChapels(event.id);
      showSuccess(response?.message || 'Chapels and chapel leaders synced');
    } catch (err) {
      showError(err.message || 'Failed to sync chapels');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              CA
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Church Attendance System</h1>
              <p className="text-xs text-gray-500">Signed in as {user?.name || user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
        {isAdmin && (
          <section>
            <h2 className="text-xl font-bold text-gray-900">Create new event</h2>
            <p className="mt-1 text-sm text-gray-600">
              Chapels and chapel leaders are copied in from Homecoming automatically. Chariots are only used in Homecoming.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => setCreating({ name })}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <PlusIcon className="h-5 w-5" />
                  {name}
                </button>
              ))}
              <button
                onClick={() => setCreating({})}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5" />
                New event
              </button>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold text-gray-900">Events</h2>
          <p className="mt-1 text-sm text-gray-600">Choose an event to open its dashboard.</p>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
            </div>
          ) : events.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
              No events yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const counts = event._count || {};
                const dates = formatDateRange(event.startDate, event.endDate);
                return (
                  <div
                    key={event.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-indigo-400 hover:shadow-md"
                  >
                  <button
                    onClick={() => openEvent(event)}
                    disabled={Boolean(opening)}
                    className="group flex flex-1 flex-col p-6 text-left disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      {opening === event.id ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      {dates && (
                        <p className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="h-4 w-4" /> {dates}
                        </p>
                      )}
                      {event.venue && (
                        <p className="flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4" /> {event.venue}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                        <UsersIcon className="h-3.5 w-3.5" /> {counts.members ?? 0} members
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                        {counts.sessions ?? 0} sessions
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                        {counts.chapels ?? 0} chapels
                      </span>
                      {event.hasChariots && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                          {counts.chariots ?? 0} chariots
                        </span>
                      )}
                      {!event.isActive && (
                        <span className="rounded-full bg-gray-200 px-2.5 py-1 font-medium text-gray-600">Inactive</span>
                      )}
                    </div>
                  </button>
                  {isAdmin && (
                    <div className="flex divide-x divide-gray-200 border-t border-gray-200 text-sm">
                      <button
                        onClick={() =>
                          setEditing({
                            id: event.id,
                            name: event.name,
                            description: event.description || '',
                            venue: event.venue || '',
                            startDate: toDateInput(event.startDate),
                            endDate: toDateInput(event.endDate),
                            isActive: event.isActive,
                          })
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <PencilSquareIcon className="h-4 w-4" /> Edit
                      </button>
                      {event.slug !== 'homecoming' && (
                        <button
                          onClick={() => handleSync(event)}
                          disabled={syncingId === event.id}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          title="Copy any new Homecoming chapels and chapel leaders into this event"
                        >
                          <ArrowPathIcon className={`h-4 w-4 ${syncingId === event.id ? 'animate-spin' : ''}`} />
                          {syncingId === event.id ? 'Syncing…' : 'Sync chapels'}
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {creating && (
        <EventFormModal initial={creating} onClose={() => setCreating(null)} onSubmit={handleCreate} />
      )}
      {editing && (
        <EventFormModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />
      )}
    </div>
  );
};

export default EventPickerPage;
