import { createContext, useContext, useReducer, useEffect } from 'react'

const AuthContext = createContext()

const initialState = {
  user: null,
  token: null,
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
      const user = localStorage.getItem('user')
      
      if (!token || !user) {
        dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
        return
      }

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: {
          user: JSON.parse(user),
          token: token,
        },
      })
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: false })
    }
  }

  const login = async (credentials) => {
    try {
      dispatch({ type: AuthActionTypes.LOGIN_START })
      
      // Debug logging
      console.log('Login attempt with:', credentials)
      console.log('Checking against email:', 'smartdude873@gmail.com')
      console.log('Checking against password:', 'power873')

      // Mock login - accepts any email/password for demo
      if (credentials.email && credentials.password) {
        const user = {
          id: 1,
          name: 'Admin User',
          email: credentials.email,
          role: 'admin'
        }
        const token = 'mock-jwt-token'

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        dispatch({
          type: AuthActionTypes.LOGIN_SUCCESS,
          payload: { user, token },
        })

        console.log('Login successful!')
        return { success: true }
      } else {
        console.log('Invalid credentials - email or password mismatch')
        throw new Error('Invalid email or password. Please check your credentials.')
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed'
      console.error('Login error:', errorMessage)
      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch({ type: AuthActionTypes.LOGOUT })
  }

  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR })
  }

  const value = {
    ...state,
    login,
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