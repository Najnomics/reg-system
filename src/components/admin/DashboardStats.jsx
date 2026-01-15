import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar 
} from 'recharts'

const DashboardStats = () => {
  const [attendanceData, setAttendanceData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStatsData()
  }, [])

  const loadStatsData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch real analytics data
      const apiService = (await import('../../services/apiService')).default
      const response = await apiService.getAnalytics({ period: '180' }) // Last 6 months
      
      if (response.success && response.data) {
        const { charts } = response.data
        
        // Process attendance by day for monthly trend (last 6 months)
        const attendanceByDay = charts?.attendanceByDay || {}
        const monthlyData = {}
        
        Object.keys(attendanceByDay).forEach(dateStr => {
          const date = new Date(dateStr)
          const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + attendanceByDay[dateStr]
        })
        
        // Convert to array format for chart (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const now = new Date()
        const last6Months = []
        
        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthKey = monthNames[monthDate.getMonth()]
          last6Months.push({
            month: monthKey,
            attendance: monthlyData[monthKey] || 0
          })
        }
        
        setAttendanceData(last6Months)
        
        // Process attendance by hour for weekly data (convert hours to days of week)
        const attendanceByHour = charts?.attendanceByHour || {}
        const weeklyData = [
          { day: 'Mon', count: 0 },
          { day: 'Tue', count: 0 },
          { day: 'Wed', count: 0 },
          { day: 'Thu', count: 0 },
          { day: 'Fri', count: 0 },
          { day: 'Sat', count: 0 },
          { day: 'Sun', count: 0 },
        ]
        
        // Get recent attendance data to calculate day of week distribution
        const trendsResponse = await apiService.getAttendanceTrends({ period: '30' })
        if (trendsResponse.success && trendsResponse.data?.trends?.dayOfWeek) {
          const dayOfWeekTrends = trendsResponse.data.trends.dayOfWeek
          const dayMap = {
            'Sunday': 'Sun',
            'Monday': 'Mon',
            'Tuesday': 'Tue',
            'Wednesday': 'Wed',
            'Thursday': 'Thu',
            'Friday': 'Fri',
            'Saturday': 'Sat',
          }
          
          weeklyData.forEach(day => {
            const fullDayName = Object.keys(dayMap).find(key => dayMap[key] === day.day)
            day.count = dayOfWeekTrends[fullDayName] || 0
          })
        }
        
        setWeeklyData(weeklyData)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load stats data:', error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Attendance Analytics</h3>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-center h-64">
            <div className="loading loading-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Monthly Attendance Trend</h3>
          <p className="text-sm text-gray-600">Last 6 months</p>
        </div>
        <div className="card-body">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">This Week's Attendance</h3>
          <p className="text-sm text-gray-600">Daily breakdown</p>
        </div>
        <div className="card-body">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="day" 
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardStats