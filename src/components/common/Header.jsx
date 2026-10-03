import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/SimpleAppContext'
import { useEvent } from '../../contexts/EventContext'

const EVENT_SWITCHER_ROLES = ['admin', 'reg-rep', 'pastoral']

const roleLabel = (userType, user, long = false) => {
  switch (userType) {
    case 'admin':
      return 'Administrator'
    case 'reg-rep':
      return long ? 'Registration Representative' : 'Registration Rep'
    case 'pastoral':
      return 'Pastoral Team'
    case 'chariot-leader':
      return `Chariot Leader${user?.isChapelLeader ? ' & Chapel Leader' : ''}`
    case 'chariot-assistant':
      return 'Chariot Assistant'
    case 'chapel-leader':
      return 'Chapel Leader'
    default:
      return 'User'
  }
}

const Header = () => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const { user, userType, logout } = useAuth()
  const { toggleSidebar, notifications, clearNotifications, showError } = useApp()
  const { events, currentEvent, currentEventId, selectEvent } = useEvent()
  const isStaff = EVENT_SWITCHER_ROLES.includes(userType)
  const canSwitchEvents = userType === 'chapel-leader' && events.length > 1

  const handleSelectEvent = async (eventId) => {
    try {
      await selectEvent(eventId)
    } catch (error) {
      showError?.(error.message || 'Could not switch event')
    }
  }

  const handleLogout = () => {
    logout()
    setProfileDropdownOpen(false)
  }

  const unreadNotifications = notifications.filter(n => !n.read).length

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 touch-manipulation"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
          </button>
          
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-gray-900">
              Church Attendance System
            </h2>
          </div>

          {canSwitchEvents ? (
            <select
              value={currentEventId}
              onChange={(e) => handleSelectEvent(e.target.value)}
              className="max-w-[11rem] sm:max-w-xs rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
              aria-label="Current event"
              title="Switch event"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}{event.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          ) : currentEvent ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg truncate max-w-[9rem] sm:max-w-xs">
                {currentEvent.name}
              </span>
              {isStaff && (
                <Link
                  to="/events"
                  className="whitespace-nowrap text-sm font-medium text-gray-600 hover:text-indigo-700 underline-offset-2 hover:underline"
                >
                  Change event
                </Link>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative touch-manipulation"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 touch-manipulation"
              aria-label="User menu"
            >
              <UserCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-gray-600" />
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </div>
                <div className="text-xs text-gray-600">
                  {roleLabel(userType, user)}
                </div>
              </div>
            </button>

            {profileDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setProfileDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.name || 'User'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user?.email}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {roleLabel(userType, user, true)}
                      </div>
                      {/* Show chapel names if user is a chapel leader */}
                      {user?.isChapelLeader && user?.chapelNames && user.chapelNames.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          Chapel: {user.chapelNames.join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <Link
                      to="/admin/settings"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
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