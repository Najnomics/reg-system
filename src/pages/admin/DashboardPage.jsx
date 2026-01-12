import { useState, useEffect } from 'react'
import { 
  UsersIcon, 
  CalendarIcon, 
  ClipboardDocumentCheckIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/SimpleAppContext'
import DashboardStats from '../../components/admin/DashboardStats'
import RecentActivity from '../../components/admin/RecentActivity'
import QuickActions from '../../components/admin/QuickActions'

const DashboardPage = () => {
  const { user } = useAuth()
  const { showSuccess } = useApp()
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeSessions: 0,
    todayAttendance: 0,
    monthlyGrowth: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    showSuccess(`Welcome back, ${user?.name || 'Admin'}!`)
  }, [user, showSuccess])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement API calls to fetch dashboard data
      // const response = await dashboardService.getStats()
      
      // Mock data for now
      setTimeout(() => {
        setStats({
          totalMembers: 1247,
          activeSessions: 3,
          todayAttendance: 156,
          monthlyGrowth: 8.2,
        })
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Manage Members',
      description: 'View and manage church members',
      icon: UsersIcon,
      href: '/admin/members',
      color: 'primary',
    },
    {
      title: 'Create New Session',
      description: 'Set up a new attendance session',
      icon: CalendarIcon,
      href: '/admin/sessions/new',
      color: 'success',
    },
    {
      title: 'Session Management',
      description: 'Manage all church sessions',
      icon: ClipboardDocumentCheckIcon,
      href: '/admin/sessions',
      color: 'warning',
    },
    {
      title: 'Generate Report',
      description: 'Create attendance reports',
      icon: ChartBarIcon,
      href: '/admin/reports',
      color: 'secondary',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here's what's happening today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <div className="stats-value">
                {isLoading ? (
                  <div className="loading loading-sm"></div>
                ) : (
                  stats.totalMembers.toLocaleString()
                )}
              </div>
              <div className="stats-label">Total Members</div>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <div className="stats-value">
                {isLoading ? (
                  <div className="loading loading-sm"></div>
                ) : (
                  stats.activeSessions
                )}
              </div>
              <div className="stats-label">Active Sessions</div>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-4">
              <div className="stats-value">
                {isLoading ? (
                  <div className="loading loading-sm"></div>
                ) : (
                  stats.todayAttendance
                )}
              </div>
              <div className="stats-label">Today's Attendance</div>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <div className="stats-value">
                {isLoading ? (
                  <div className="loading loading-sm"></div>
                ) : (
                  `+${stats.monthlyGrowth}%`
                )}
              </div>
              <div className="stats-label">Monthly Growth</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardStats />
        </div>
        
        <div>
          <QuickActions actions={quickActions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">System Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <span className="badge badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Service</span>
                <span className="badge badge-success">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">QR Generator</span>
                <span className="badge badge-success">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Backup</span>
                <span className="text-sm text-gray-600">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage