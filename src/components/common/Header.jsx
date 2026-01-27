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

const Header = () => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const { user, userType, logout } = useAuth()
  const { toggleSidebar, notifications, clearNotifications } = useApp()

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
          
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold text-gray-900">
              Church Attendance System
            </h2>
          </div>
          <div className="sm:hidden">
            <h2 className="text-base font-semibold text-gray-900">
              Church Admin
            </h2>
          </div>
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
                  {userType === 'admin' 
                    ? 'Administrator' 
                    : userType === 'reg-rep'
                    ? 'Registration Rep'
                    : userType === 'chariot-leader'
                    ? `Chariot Leader${user?.isChapelLeader ? ' & Chapel Leader' : ''}`
                    : userType === 'chariot-assistant'
                    ? 'Chariot Assistant'
                    : 'User'}
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
                        {userType === 'admin' 
                          ? 'Administrator' 
                          : userType === 'reg-rep'
                          ? 'Registration Representative'
                          : userType === 'chariot-leader'
                          ? `Chariot Leader${user?.isChapelLeader ? ' & Chapel Leader' : ''}`
                          : userType === 'chariot-assistant'
                          ? 'Chariot Assistant'
                          : 'User'}
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