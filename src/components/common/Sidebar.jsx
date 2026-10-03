import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEvent } from '../../contexts/EventContext';
import { formatDateRange } from '../../utils/eventFormat';
import {
  Squares2X2Icon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TruckIcon,
  BuildingLibraryIcon,
  IdentificationIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const STAFF_ROLES = ['admin', 'reg-rep', 'pastoral'];

const getNavigationItems = (userType, user, hasChariots) => {
  if (['chariot-leader', 'chariot-assistant', 'chapel-leader'].includes(userType)) {
    return [
      { name: 'Overview', href: '/chariot/dashboard', icon: Squares2X2Icon },
      { name: 'Members', href: '/chariot/members', icon: UsersIcon },
      { name: 'Sessions', href: '/chariot/sessions', icon: CalendarDaysIcon },
    ];
  }

  const items = [
    { name: 'Overview', href: '/admin/dashboard', icon: Squares2X2Icon },
    { name: 'Members', href: '/admin/members', icon: UsersIcon },
    { name: 'Sessions', href: '/admin/sessions', icon: CalendarDaysIcon },
  ];

  if (userType === 'admin' || userType === 'pastoral') {
    items.push({ name: 'Chapels', href: '/admin/chapels', icon: BuildingLibraryIcon });
    if (hasChariots) items.push({ name: 'Chariots', href: '/admin/chariots', icon: TruckIcon });
  } else if (userType === 'reg-rep' && user?.canAssignChapels) {
    items.push({ name: 'Chapels', href: '/admin/chapels', icon: BuildingLibraryIcon });
  }

  items.push({ name: 'Reports', href: '/admin/reports', icon: ChartBarIcon });

  if (userType === 'admin') {
    items.push({ name: 'Reg-Reps', href: '/admin/reg-reps', icon: IdentificationIcon });
  }

  return items;
};

const roleTitle = (userType) => {
  switch (userType) {
    case 'admin': return 'Administrator';
    case 'pastoral': return 'Pastoral team';
    case 'reg-rep': return 'Registration rep';
    case 'chariot-leader': return 'Chariot leader';
    case 'chariot-assistant': return 'Chariot assistant';
    case 'chapel-leader': return 'Chapel leader';
    default: return 'Church portal';
  }
};

const Sidebar = () => {
  const { sidebarOpen, setSidebar } = useApp();
  const { userType, user } = useAuth();
  const { hasChariots, currentEvent } = useEvent();
  const isStaff = STAFF_ROLES.includes(userType);

  const navigation = getNavigationItems(userType, user, hasChariots);
  const dates = currentEvent ? formatDateRange(currentEvent.startDate, currentEvent.endDate) : null;

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden animate-fade-in"
          onClick={() => setSidebar(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-paper
          transition-transform duration-300 ease-out
          lg:static lg:translate-x-0 lg:w-60
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 flex-shrink-0 items-center justify-between px-5">
            <Link to={isStaff ? '/events' : '/chariot/dashboard'} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-indigo-600" />
              <span className="text-[13px] font-semibold tracking-tight text-ink">Attendance</span>
            </Link>
            <button
              className="lg:hidden rounded-md p-1 text-gray-500 hover:text-ink"
              onClick={() => setSidebar(false)}
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {currentEvent && (
            <div className="px-3 pb-3">
              {isStaff ? (
                <Link
                  to="/events"
                  onClick={() => setSidebar(false)}
                  className="group flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5 transition-colors hover:border-gray-300"
                  title="Switch event"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{currentEvent.name}</div>
                    <div className="truncate text-[11px] text-gray-500">{dates || 'Dates to be set'}</div>
                  </div>
                  <ArrowsRightLeftIcon className="h-4 w-4 flex-shrink-0 text-gray-400 transition-colors group-hover:text-indigo-600" />
                </Link>
              ) : (
                <div className="rounded-lg border border-line bg-white px-3 py-2.5">
                  <div className="truncate text-[13px] font-medium text-ink">{currentEvent.name}</div>
                  <div className="truncate text-[11px] text-gray-500">{roleTitle(userType)}</div>
                </div>
              )}
            </div>
          )}

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setSidebar(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150 ${
                    isActive
                      ? 'bg-white text-ink font-medium shadow-[inset_0_0_0_1px_#E7E5DF]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex-shrink-0 border-t border-line px-5 py-4">
            {isStaff ? (
              <Link
                to="/events"
                onClick={() => setSidebar(false)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-ink"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" /> All events
              </Link>
            ) : (
              <p className="text-xs text-gray-500">{roleTitle(userType)}</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
