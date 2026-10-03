import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  IdentificationIcon,
  PlusIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';
import { useEvent } from '../../contexts/EventContext';
import apiService from '../../services/apiService';
import { formatDateRange, formatNumber } from '../../utils/eventFormat';

const useCountUp = (target, duration = 1100) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return target ? value : 0;
};

const Kpi = ({ label, value, suffix = '', note, loading, index }) => {
  const shown = useCountUp(loading ? 0 : value);
  return (
    <div className="rise bg-white px-5 py-4" style={{ '--i': index + 1 }}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="num mt-2 text-[28px] leading-none text-ink">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-gray-100" /> : `${formatNumber(shown)}${suffix}`}
      </div>
      <div className="mt-2 h-4 text-xs text-indigo-700">{!loading && note}</div>
    </div>
  );
};

const shortDay = (date) =>
  new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

const shortTime = (date) =>
  new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const MOBILE_BARS = 7;

const SessionChart = ({ sessions, loading }) => {
  const mobileHidden = (i) => (i < sessions.length - MOBILE_BARS ? 'hidden sm:flex' : 'flex');
  const max = Math.max(1, ...sessions.map((s) => s.count));
  const latestIndex = sessions.reduce((acc, s, i) => (s.count > 0 ? i : acc), -1);

  if (loading) {
    return <div className="mt-6 h-[260px] animate-pulse rounded-lg bg-gray-50" />;
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-6 flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-line text-center">
        <p className="text-sm text-gray-500">No sessions yet</p>
        <p className="mt-1 text-xs text-gray-400">Check-ins per session will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex h-[260px] items-end gap-2 border-b border-line sm:gap-3">
        {sessions.map((s, i) => {
          const height = Math.max(1, (s.count / max) * 88);
          return (
            <div key={s.id} className={`group relative h-full min-w-0 flex-1 flex-col justify-end ${mobileHidden(i)}`} title={`${s.label} · ${formatNumber(s.count)} check-ins`}>
              <span
                className="fade num mb-1.5 text-center text-[11px] text-gray-500 transition-colors group-hover:text-ink"
                style={{ '--i': i + 6 }}
              >
                {formatNumber(s.count)}
              </span>
              <div
                className={`grow-y rounded-t-[3px] transition-colors ${
                  i === latestIndex ? 'bg-indigo-600' : 'bg-ink group-hover:bg-gray-700'
                }`}
                style={{ height: `${height}%`, '--i': i }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {sessions.map((s, i) => (
          <span key={s.id} className={`min-w-0 flex-1 flex-col text-center font-mono text-[10px] leading-tight text-gray-400 ${mobileHidden(i)}`}>
            <span className="block truncate">{shortDay(s.startTime)}</span>
            <span className="block truncate text-gray-300">{shortTime(s.startTime)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const ChapelMeters = ({ chapels, loading, hasSession }) => {
  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-gray-50" />
        ))}
      </div>
    );
  }

  if (chapels.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">No chapels in this event yet.</p>;
  }

  if (!hasSession) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-line px-4 py-8 text-center">
        <p className="text-sm text-gray-500">{chapels.length} chapels ready</p>
        <p className="mt-1 text-xs text-gray-400">Attendance by chapel appears after the first session.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 divide-y divide-line">
      {chapels.map((c, i) => (
        <div key={c.id} className="grid grid-cols-[1fr_88px_44px] items-center gap-3 py-2.5 text-[13px]">
          <span className="truncate text-ink" title={`${c.present} of ${c.total} present`}>{c.name}</span>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div className="grow-x h-full rounded-full bg-indigo-600" style={{ width: `${c.rate}%`, '--i': i }} />
          </div>
          <span className="num text-right text-xs text-gray-600">{c.rate}%</span>
        </div>
      ))}
    </div>
  );
};

const ActionRow = ({ icon: Icon, label, hint, to, onClick, disabled }) => {
  const className =
    'group flex w-full items-center gap-3 px-5 py-3 text-left text-[13px] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
  const body = (
    <>
      <Icon className="h-[18px] w-[18px] flex-shrink-0 text-gray-400 transition-colors group-hover:text-indigo-600" />
      <span className="flex-1 text-ink">{label}</span>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
      <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-ink" />
    </>
  );
  return to ? (
    <Link to={to} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>{body}</button>
  );
};

const SimpleDashboard = () => {
  const navigate = useNavigate();
  const { userType } = useAuth();
  const { showSuccess, showError } = useApp();
  const { hasChariots, currentEvent } = useEvent();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sortUploadBusy, setSortUploadBusy] = useState(false);
  const sortUploadRef = useRef(null);
  const isAdmin = userType === 'admin';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats(true);
      setDashboardData(response.data);
      setLoadFailed(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUnassignedToChariots = async () => {
    if (!window.confirm('Assign all unassigned members to chariots?')) return;
    try {
      const response = await apiService.assignUnassignedMembersToChariots();
      showSuccess(`Assigned ${response?.data?.assigned || 0} members to chariots`);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to assign members to chariots:', error);
      showError(error.message || 'Failed to assign members to chariots');
    }
  };

  const handleSortUploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSortUploadBusy(true);
    try {
      const response = await apiService.sortUploadMembers(file);
      const summary = response?.data?.summary;
      showSuccess(
        summary
          ? `Sort upload done. Created: ${summary.createdMembers}, Workers: ${summary.workersMarked}, Invitees: ${summary.inviteesAssigned}, Members: ${summary.membersMarked}`
          : 'Sort upload completed'
      );
      fetchDashboardData();
    } catch (error) {
      console.error('Sort upload failed:', error);
      showError(error.message || 'Sort upload failed');
    } finally {
      setSortUploadBusy(false);
      if (sortUploadRef.current) sortUploadRef.current.value = '';
    }
  };

  const pending = loading || (loadFailed && !dashboardData);
  const stats = dashboardData?.stats || {};
  const sessions = dashboardData?.sessionAttendance || [];
  const chapels = dashboardData?.chapelAttendance || [];
  const activity = dashboardData?.recentActivity || [];
  const eventDates = currentEvent ? formatDateRange(currentEvent.startDate, currentEvent.endDate) : null;

  const sessionNote = stats.activeSessions
    ? `${stats.activeSessions} open now`
    : stats.upcomingSessions
      ? `${stats.upcomingSessions} upcoming`
      : '';

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium tracking-tight text-ink">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentEvent?.name}
            {eventDates && <span className="text-gray-400"> · {eventDates}</span>}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/admin/sessions/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-colors hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4" />
            New session
          </button>
        )}
      </div>

      {loadFailed && !loading && (
        <div className="rise flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <p className="text-[13px] text-red-800">
            {dashboardData ? 'Couldn’t refresh the figures — showing the last ones loaded.' : 'Couldn’t load the figures for this event. Your data is safe.'}
          </p>
          <button
            onClick={fetchDashboardData}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <Kpi index={0} loading={pending} label="Members" value={stats.totalMembers || 0} />
        <Kpi index={1} loading={pending} label="Check-ins" value={stats.totalCheckins || 0} note={stats.todaysAttendance ? `+${formatNumber(stats.todaysAttendance)} today` : ''} />
        <Kpi index={2} loading={pending} label="Sessions" value={stats.totalSessions || 0} note={sessionNote} />
        <Kpi index={3} loading={pending} label="Today's attendance" value={stats.attendanceRate || 0} suffix="%" note="of the register" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rise panel p-5" style={{ '--i': 5 }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-medium text-ink">Check-ins per session</h2>
            {sessions.length > 0 && (
              <span className="text-xs text-gray-400">
                <span className="sm:hidden">Last {Math.min(sessions.length, MOBILE_BARS)}</span>
                <span className="hidden sm:inline">Last {sessions.length}</span>
              </span>
            )}
          </div>
          <SessionChart sessions={sessions} loading={pending} />
        </section>

        <section className="rise panel p-5" style={{ '--i': 6 }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-medium text-ink">Chapel attendance</h2>
            <span className="max-w-[60%] truncate text-xs text-gray-400" title={dashboardData?.lastSession?.label}>
              {dashboardData?.lastSession?.label || ''}
            </span>
          </div>
          <ChapelMeters chapels={chapels} loading={pending} hasSession={Boolean(dashboardData?.lastSession)} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rise panel overflow-hidden" style={{ '--i': 7 }}>
          <h2 className="px-5 pb-2 pt-4 text-[13px] font-medium text-ink">Quick actions</h2>
          <div className="divide-y divide-line border-t border-line">
            <ActionRow icon={UsersIcon} label={isAdmin ? 'Manage members' : 'View members'} to="/admin/members" />
            {isAdmin && <ActionRow icon={PlusIcon} label="Create a session" hint="QR code included" to="/admin/sessions/new" />}
            <ActionRow icon={CalendarDaysIcon} label="View sessions" to="/admin/sessions" />
            <ActionRow icon={ChartBarIcon} label="Generate a report" to="/admin/reports" />
            {isAdmin && <ActionRow icon={IdentificationIcon} label="Manage reg-reps" to="/admin/reg-reps" />}
            {isAdmin && hasChariots && (
              <ActionRow icon={TruckIcon} label="Assign unassigned members to chariots" onClick={handleAssignUnassignedToChariots} />
            )}
            {isAdmin && hasChariots && (
              <>
                <ActionRow
                  icon={ArrowUpTrayIcon}
                  label={sortUploadBusy ? 'Sorting upload…' : 'Sort upload'}
                  hint="CSV"
                  onClick={() => sortUploadRef.current?.click()}
                  disabled={sortUploadBusy}
                />
                <input ref={sortUploadRef} type="file" accept=".csv" className="hidden" onChange={handleSortUploadFile} />
              </>
            )}
          </div>
        </section>

        <section className="rise panel overflow-hidden" style={{ '--i': 8 }}>
          <h2 className="px-5 pb-2 pt-4 text-[13px] font-medium text-ink">Recent activity</h2>
          <div className="divide-y divide-line border-t border-line">
            {pending ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="mx-5 my-3 h-4 animate-pulse rounded bg-gray-50" />)
            ) : activity.length > 0 ? (
              activity.map((item, i) => (
                <div key={item.id} className="fade flex items-start gap-3 px-5 py-3" style={{ '--i': i + 8 }}>
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      item.type === 'check-in' ? 'bg-indigo-600' : 'bg-gray-400'
                    }`}
                  />
                  <p className="flex-1 text-[13px] text-ink">{item.message}</p>
                  <span className="whitespace-nowrap font-mono text-[11px] text-gray-400">{item.time}</span>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SimpleDashboard;
