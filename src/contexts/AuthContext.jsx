import { createContext, useContext, useReducer, useEffect } from 'react'
import { apiService } from '../services/apiService'
import { dataPreloader } from '../utils/preloadData'

const AuthContext = createContext()

const initialState = {
  user: null,
  token: null,
  userType: null, // 'admin', 'reg-rep', 'chariot-leader', or 'chariot-assistant'
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

const AuthActionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
}

const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case AuthActionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        userType: action.payload.userType,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }

    case AuthActionTypes.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }

    case AuthActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        userType: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }

    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }

    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      }

    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
        return
      }

      const response = await apiService.verifyToken()
      if (response && response.valid && response.user) {
        dispatch({
          type: AuthActionTypes.LOGIN_SUCCESS,
          payload: {
            user: response.user,
            token,
            userType: response.userType,
          },
        })
        
        // Preload critical data when user is already authenticated
        dataPreloader.preloadCriticalData().catch(() => {});
      } else {
        localStorage.removeItem('token')
        dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
      }
    } catch (error) {
      localStorage.removeItem('token')
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
    }
  }

  const login = async (credentials) => {
    try {
      dispatch({ type: AuthActionTypes.LOGIN_START })
      
      const response = await apiService.login(credentials)
      
      localStorage.setItem('token', response.token)

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: response.user || response.admin || response.regRep,
          token: response.token,
          userType: response.userType,
        },
      })

      // Preload critical data immediately after login for faster navigation
      dataPreloader.preloadCriticalData().catch(() => {});

      return { success: true }
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  const loginChariot = async (email, password, userType) => {
    try {
      dispatch({ type: AuthActionTypes.LOGIN_START })
      
      const response = await apiService.loginChariot(email, password, userType)
      
      localStorage.setItem('token', response.token)

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: response.user,
          token: response.token,
          userType: response.userType,
        },
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    dispatch({ type: AuthActionTypes.LOGOUT })
  }

  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR })
  }

  const value = {
    ...state,
    login,
    loginChariot,
    logout,
    clearError,
    checkAuthStatus,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthActionTypes }