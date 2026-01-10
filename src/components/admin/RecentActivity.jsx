import { useState, useEffect } from 'react'
import { 
  UserPlusIcon, 
  ClipboardDocumentCheckIcon,
  CalendarIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

const RecentActivity = () => {
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      setIsLoading(true)
      
      // Mock recent activity data
      const mockActivities = [
        {
          id: 1,
          type: 'member_added',
          title: 'New member registered',
          description: 'John Doe was added to the system',
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          icon: UserPlusIcon,
          color: 'success',
        },
        {
          id: 2,
          type: 'attendance_recorded',
          title: 'Attendance recorded',
          description: '45 members checked in for Sunday Service',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          icon: ClipboardDocumentCheckIcon,
          color: 'primary',
        },
        {
          id: 3,
          type: 'session_created',
          title: 'New session created',
          description: 'Wednesday Bible Study session created',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
          icon: CalendarIcon,
          color: 'warning',
        },
        {
          id: 4,
          type: 'system_alert',
          title: 'Low attendance alert',
          description: 'Tuesday Prayer Meeting had low attendance (12 members)',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          icon: ExclamationTriangleIcon,
          color: 'error',
        },
        {
          id: 5,
          type: 'member_added',
          title: 'Bulk members imported',
          description: '25 new members imported from Excel file',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
          icon: UserPlusIcon,
          color: 'success',
        },
      ]

      setTimeout(() => {
        setActivities(mockActivities)
        setIsLoading(false)
      }, 600)
    } catch (error) {
      console.error('Failed to load recent activity:', error)
      setIsLoading(false)
    }
  }

  const getActivityColor = (color) => {
    const colors = {
      primary: 'text-indigo-600 bg-indigo-100',
      success: 'text-success-600 bg-success-100',
      warning: 'text-warning-600 bg-warning-100',
      error: 'text-red-600 bg-red-100',
      secondary: 'text-gray-600 bg-gray-100',
    }
    return colors[color] || colors.primary
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <p className="text-sm text-gray-600">Latest system events</p>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div 
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    getActivityColor(activity.color)
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all activity →
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecentActivity