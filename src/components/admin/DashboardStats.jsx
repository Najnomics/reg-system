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
      
      // Mock data for attendance trend
      const mockAttendanceData = [
        { month: 'Jan', attendance: 450 },
        { month: 'Feb', attendance: 520 },
        { month: 'Mar', attendance: 480 },
        { month: 'Apr', attendance: 650 },
        { month: 'May', attendance: 720 },
        { month: 'Jun', attendance: 680 },
      ]

      // Mock data for weekly attendance
      const mockWeeklyData = [
        { day: 'Mon', count: 45 },
        { day: 'Tue', count: 32 },
        { day: 'Wed', count: 78 },
        { day: 'Thu', count: 28 },
        { day: 'Fri', count: 56 },
        { day: 'Sat', count: 89 },
        { day: 'Sun', count: 156 },
      ]

      setTimeout(() => {
        setAttendanceData(mockAttendanceData)
        setWeeklyData(mockWeeklyData)
        setIsLoading(false)
      }, 800)
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