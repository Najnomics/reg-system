import { createContext, useContext, useReducer, useState } from 'react'
import { memberService } from '../services/memberService'
import { sessionService } from '../services/sessionService'
import { reportsService } from '../services/reportsService'

const AppContext = createContext()

// Initial state
const initialState = {
  notifications: [],
  theme: 'light',
  sidebarOpen: true,
  churchInfo: {
    name: import.meta.env.VITE_APP_NAME || 'Church Attendance System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
}

// Action types
const AppActionTypes = {
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR: 'SET_SIDEBAR',
  SET_THEME: 'SET_THEME',
  UPDATE_CHURCH_INFO: 'UPDATE_CHURCH_INFO',
}

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case AppActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            ...action.payload,
          },
        ],
      }

    case AppActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload
        ),
      }

    case AppActionTypes.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
      }

    case AppActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      }

    case AppActionTypes.SET_SIDEBAR:
      return {
        ...state,
        sidebarOpen: action.payload,
      }

    case AppActionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      }

    case AppActionTypes.UPDATE_CHURCH_INFO:
      return {
        ...state,
        churchInfo: {
          ...state.churchInfo,
          ...action.payload,
        },
      }

    default:
      return state
  }
}

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  // Actions
  const addNotification = (notification) => {
    dispatch({
      type: AppActionTypes.ADD_NOTIFICATION,
      payload: notification,
    })

    // Auto remove after 5 seconds for success/info notifications
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        removeNotification(notification.id || Date.now())
      }, 5000)
    }
  }

  const removeNotification = (id) => {
    dispatch({
      type: AppActionTypes.REMOVE_NOTIFICATION,
      payload: id,
    })
  }

  const clearNotifications = () => {
    dispatch({
      type: AppActionTypes.CLEAR_NOTIFICATIONS,
    })
  }

  const toggleSidebar = () => {
    dispatch({
      type: AppActionTypes.TOGGLE_SIDEBAR,
    })
  }

  const setSidebar = (isOpen) => {
    dispatch({
      type: AppActionTypes.SET_SIDEBAR,
      payload: isOpen,
    })
  }

  const setTheme = (theme) => {
    dispatch({
      type: AppActionTypes.SET_THEME,
      payload: theme,
    })
  }

  const updateChurchInfo = (info) => {
    dispatch({
      type: AppActionTypes.UPDATE_CHURCH_INFO,
      payload: info,
    })
  }

  // Helper functions for notifications
  const showSuccess = (message, title = 'Success') => {
    addNotification({
      type: 'success',
      title,
      message,
    })
  }

  const showError = (message, title = 'Error') => {
    addNotification({
      type: 'error',
      title,
      message,
    })
  }

  const showWarning = (message, title = 'Warning') => {
    addNotification({
      type: 'warning',
      title,
      message,
    })
  }

  const showInfo = (message, title = 'Info') => {
    addNotification({
      type: 'info',
      title,
      message,
    })
  }

  // Data fetching functions
  const fetchMembers = async () => {
    try {
      setLoading(true)
      const data = await memberService.getAllMembers()
      setMembers(data.members || data)
    } catch (error) {
      showError(error.message, 'Failed to fetch members')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const data = await sessionService.getAllSessions()
      setSessions(data.sessions || data)
    } catch (error) {
      showError(error.message, 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const fetchReportData = async (filters = {}) => {
    try {
      setLoading(true)
      const data = await reportsService.getReportData(filters)
      return data
    } catch (error) {
      showError(error.message, 'Failed to fetch report data')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value = {
    ...state,
    // Data
    members,
    sessions,
    loading,
    // Actions
    addNotification,
    removeNotification,
    clearNotifications,
    toggleSidebar,
    setSidebar,
    setTheme,
    updateChurchInfo,
    // Data functions
    fetchMembers,
    fetchSessions,
    fetchReportData,
    // Helper functions
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Custom hook
export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export { AppActionTypes }