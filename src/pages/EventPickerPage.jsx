import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/SimpleAppContext';
import { useEvent } from '../contexts/EventContext';
import { EventFormModal } from './admin/EventsPage';
import { formatDateRange, formatNumber, toDateInput } from '../utils/eventFormat';

const STAFF_ROLES = ['admin', 'reg-rep', 'pastoral'];
const SUGGESTED_EVENTS = ['Word Conference'];

const Stat = ({ value, label }) => (
  <div>
    <div className="num text-[22px] leading-none text-ink">{formatNumber(value)}</div>
    <div className="mt-1.5 text-[11px] text-gray-500">{label}</div>
  </div>
);

const EventTile = ({ event, index, isAdmin, opening, syncing, onOpen, onEdit, onSync }) => {
  const counts = event._count || {};
  const dates = formatDateRange(event.startDate, event.endDate);
  const settingUp = (counts.sessions ?? 0) === 0;
  const isOpening = opening === event.id;

  return (
    <div className="rise group relative flex flex-col bg-white" style={{ '--i': index + 2 }}>
      <button
        onClick={() => onOpen(event)}
        disabled={Boolean(opening)}
        className="flex flex-1 flex-col p-6 text-left transition-colors duration-150 hover:bg-gray-50/60 disabled:cursor-wait"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-gray-500">{dates || 'Dates to be set'}</span>
          <div className="flex items-center gap-1.5">
            {!event.isActive && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Inactive</span>
            )}
            {event.hasChariots ? (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">Chariots</span>
            ) : settingUp ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">Setting up</span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-[22px] font-medium tracking-tight text-ink">{event.name}</h2>
            <p className="mt-1 truncate text-[13px] text-gray-500">{event.venue || 'Venue to be set'}</p>
          </div>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-gray-500 transition-all duration-200 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
            {isOpening ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            )}
          </span>
        </div>

        <div className="min-h-[2.5rem] flex-1" />
        <div className="grid grid-cols-3 gap-4 border-t border-line pt-5">
          <Stat value={counts.members} label="Members" />
          <Stat value={counts.sessions} label="Sessions" />
          <Stat value={counts.chapels} label="Chapels" />
        </div>
      </button>

      {isAdmin && (
        <div className="flex items-center gap-4 border-t border-line px-6 py-2.5 text-xs">
          <button onClick={() => onEdit(event)} className="text-gray-500 transition-colors hover:text-ink">
            Edit details
          </button>
          {event.slug !== 'homecoming' && (
            <button
              onClick={() => onSync(event)}
              disabled={syncing}
              className="inline-flex items-center gap-1 text-gray-500 transition-colors hover:text-ink disabled:opacity-50"
              title="Copy any new Homecoming chapels and chapel leaders into this event"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync chapels'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const NewEventPanel = ({ suggestions, onCreate, index }) => (
  <div className="rise flex flex-col bg-white p-6" style={{ '--i': index + 2 }}>
    <h2 className="text-[17px] font-medium text-ink">New event</h2>
    <p className="mt-1 text-[13px] text-gray-500">Chapels and chapel leaders are copied in from Homecoming.</p>
    <div className="mt-5 space-y-2">
      {suggestions.map((name) => (
        <button
          key={name}
          onClick={() => onCreate({ name })}
          className="group flex w-full items-center justify-between rounded-lg border border-line px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:border-indigo-600"
        >
          {name}
          <span className="text-[11px] text-gray-400 group-hover:text-indigo-600">Suggested</span>
        </button>
      ))}
      <button
        onClick={() => onCreate({})}
        className="group flex w-full items-center justify-between rounded-lg border border-line px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:border-indigo-600"
      >
        Blank event
        <PlusIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
      </button>
    </div>
    <p className="mt-auto pt-6 text-[11px] leading-relaxed text-gray-400">Chariots are only used in Homecoming.</p>
  </div>
);

const EventPickerPage = () => {
  const { user, userType, logout, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useApp();
  const { events, loading, loadError, refreshEvents, selectEvent, createEvent, updateEvent, syncEventChapels } = useEvent();
  const [retrying, setRetrying] = useState(false);
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
  const totalPeople = events.reduce((sum, e) => sum + (e._count?.members || 0), 0);

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

  const startEdit = (event) =>
    setEditing({
      id: event.id,
      name: event.name,
      description: event.description || '',
      venue: event.venue || '',
      startDate: toDateInput(event.startDate),
      endDate: toDateInput(event.endDate),
      isActive: event.isActive,
    });

  const columns = events.length + (isAdmin ? 1 : 0);
  const gridCols = columns >= 3 ? 'lg:grid-cols-3' : columns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-indigo-600" />
            <span className="text-[13px] font-semibold tracking-tight text-ink">Attendance</span>
            <span className="text-[13px] text-gray-300">/</span>
            <span className="text-[13px] text-gray-500">Events</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] text-gray-500 sm:inline">{user?.name || user?.email}</span>
            <button onClick={logout} className="text-[13px] text-gray-500 transition-colors hover:text-red-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6">
        <div className="rise">
          <h1 className="text-[32px] font-medium tracking-tight text-ink">Events</h1>
          <p className="mt-1.5 text-sm text-gray-500">Open an event to manage its members, sessions and check-ins.</p>
        </div>

        {loadError && events.length === 0 && !loading ? (
          <div className="rise mt-8 rounded-xl border border-line bg-white px-6 py-10 text-center">
            <p className="text-sm text-ink">We couldn’t load your events.</p>
            <p className="mt-1 text-xs text-gray-500">The server didn’t respond in time. Your events are safe — please try again.</p>
            <button
              onClick={async () => {
                setRetrying(true);
                await refreshEvents();
                setRetrying(false);
              }}
              disabled={retrying}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Try again'}
            </button>
          </div>
        ) : loading && events.length === 0 ? (
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse bg-white" />
            ))}
          </div>
        ) : (
          <>
            <div className={`mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 ${gridCols}`}>
              {events.map((event, index) => (
                <EventTile
                  key={event.id}
                  event={event}
                  index={index}
                  isAdmin={isAdmin}
                  opening={opening}
                  syncing={syncingId === event.id}
                  onOpen={openEvent}
                  onEdit={startEdit}
                  onSync={handleSync}
                />
              ))}
              {isAdmin && <NewEventPanel suggestions={suggestions} onCreate={setCreating} index={events.length} />}
              {!isAdmin && events.length === 0 && (
                <div className="bg-white p-12 text-center text-sm text-gray-500">No events yet.</div>
              )}
            </div>

            <div className="fade mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500" style={{ '--i': events.length + 3 }}>
              <span>
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </span>
              <span>{formatNumber(totalPeople)} people across all registers</span>
            </div>
          </>
        )}
      </main>

      {creating && <EventFormModal initial={creating} onClose={() => setCreating(null)} onSubmit={handleCreate} />}
      {editing && <EventFormModal initial={editing} onClose={() => setEditing(null)} onSubmit={handleUpdate} />}
    </div>
  );
};

export default EventPickerPage;
