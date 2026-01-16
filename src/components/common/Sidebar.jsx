import { NavLink } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const getNavigationItems = (userType) => {
  const baseNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Members', href: '/admin/members', icon: UsersIcon, roles: ['admin', 'reg-rep'] },
    { name: 'Sessions', href: '/admin/sessions', icon: CalendarDaysIcon, roles: ['admin', 'reg-rep'] },
    { name: 'Reports', href: '/admin/reports', icon: DocumentChartBarIcon, roles: ['admin', 'reg-rep'] },
  ];

  // Add admin-only items
  if (userType === 'admin') {
    baseNavigation.splice(4, 0, {
      name: 'Reg-Reps',
      href: '/admin/reg-reps',
      icon: UserGroupIcon,
      roles: ['admin']
    });
  }

  return baseNavigation.filter(item => !item.roles || item.roles.includes(userType));
};

const Sidebar = () => {
  const { sidebarOpen, setSidebar } = useApp();
  const { userType } = useAuth();
  
  const navigation = getNavigationItems(userType);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 flex-shrink-0 items-center justify-between px-4 bg-gray-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CA</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-white text-lg font-semibold">
                  {userType === 'admin' ? 'Church Admin' : 'Church Portal'}
                </h1>
                {userType === 'reg-rep' && (
                  <p className="text-xs text-gray-400">Registration Rep</p>
                )}
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button
              className="lg:hidden p-1 text-gray-400 hover:text-white"
              onClick={() => setSidebar(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebar(false)}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 text-center">
              <p>Church Attendance System</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;