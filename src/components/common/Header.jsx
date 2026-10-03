import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bars3Icon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/SimpleAppContext'
import { useEvent } from '../../contexts/EventContext'

const STAFF_ROLES = ['admin', 'reg-rep', 'pastoral']

const PAGE_TITLES = [
  [/\/sessions\/[^/]+\/chariot-attendance/, 'Chariot attendance'],
  [/\/sessions\/[^/]+\/attendance/, 'Session attendance'],
  [/\/sessions\/new/, 'New session'],
  [/\/dashboard$/, 'Overview'],
  [/\/members/, 'Members'],
  [/\/sessions/, 'Sessions'],
  [/\/chapels/, 'Chapels'],
  [/\/chariots/, 'Chariots'],
  [/\/reports/, 'Reports'],
  [/\/reg-reps/, 'Reg-Reps'],
  [/\/settings/, 'Settings'],
]

const pageTitle = (pathname) => PAGE_TITLES.find(([re]) => re.test(pathname))?.[1] || 'Overview'

const roleLabel = (userType, user) => {
  switch (userType) {
    case 'admin':
      return 'Administrator'
    case 'reg-rep':
      return 'Registration rep'
    case 'pastoral':
      return 'Pastoral team'
    case 'chariot-leader':
      return `Chariot leader${user?.isChapelLeader ? ' · Chapel leader' : ''}`
    case 'chariot-assistant':
      return 'Chariot assistant'
    case 'chapel-leader':
      return 'Chapel leader'
    default:
      return 'User'
  }
}

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, userType, logout } = useAuth()
  const { toggleSidebar, notifications, showError } = useApp()
  const { events, currentEvent, currentEventId, selectEvent } = useEvent()
  const isStaff = STAFF_ROLES.includes(userType)
  const canSwitchEvents = userType === 'chapel-leader' && events.length > 1

  const handleSelectEvent = async (eventId) => {
    try {
      await selectEvent(eventId)
    } catch (error) {
      showError?.(error.message || 'Could not switch event')
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="-ml-1 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            {isStaff ? (
              <Link to="/events" className="hidden text-gray-500 transition-colors hover:text-ink sm:inline">
                Events
              </Link>
            ) : (
              <span className="hidden text-gray-500 sm:inline">Attendance</span>
            )}
            <span className="hidden text-gray-300 sm:inline">/</span>

            {canSwitchEvents ? (
              <select
                value={currentEventId}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="max-w-[11rem] truncate rounded-md border-line bg-white py-1 pl-2 pr-7 text-[13px] text-ink focus:border-indigo-500 focus:ring-indigo-500"
                aria-label="Current event"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                    {event.isActive ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            ) : (
              currentEvent && <span className="truncate text-gray-500">{currentEvent.name}</span>
            )}

            <span className="text-gray-300">/</span>
            <span className="truncate font-medium text-ink">{pageTitle(pathname)}</span>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="relative rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
            aria-label="Notifications"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-paper">
                {initials(user?.name)}
              </span>
              <span className="hidden text-[13px] font-medium text-ink sm:block">{user?.name || 'User'}</span>
              <ChevronDownIcon className={`hidden h-3.5 w-3.5 text-gray-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right animate-scale-in rounded-xl border border-line bg-white p-1.5 shadow-xl">
                  <div className="px-3 py-2.5">
                    <div className="text-[13px] font-medium text-ink">{user?.name || 'User'}</div>
                    {user?.email && <div className="truncate text-xs text-gray-500">{user.email}</div>}
                    <div className="mt-1.5 text-[11px] text-gray-500">{roleLabel(userType, user)}</div>
                    {user?.isChapelLeader && user?.chapelNames?.length > 0 && (
                      <div className="mt-0.5 text-[11px] text-indigo-700">Chapel: {user.chapelNames.join(', ')}</div>
                    )}
                  </div>
                  <div className="my-1 h-px bg-line" />
                  {isStaff && (
                    <Link
                      to="/events"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-100"
                    >
                      Switch event
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-red-700 hover:bg-red-50"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
