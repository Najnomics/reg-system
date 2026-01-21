import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import apiService from '../../services/apiService';
import {
  QrCodeIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const CheckInPage = () => {
  const { sessionId } = useParams();
  const { showError, showSuccess } = useApp();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkedInMember, setCheckedInMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [step, setStep] = useState(2); // 2: Member code (secret question step removed)
  const [formData, setFormData] = useState({
    memberCode: '',
  });

  // Ref to prevent duplicate API calls in React Strict Mode
  const sessionFetchedRef = useRef(false);
  const sessionFetchInProgressRef = useRef(false);

  // Helper function to check if device is already authenticated for this session
  const isDeviceAuthenticated = (sessionId) => {
    if (!sessionId) return false;
    
    const key = `session_auth_${sessionId}`;
    const authData = localStorage.getItem(key);
    if (!authData) return false;
    
    try {
      const { timestamp, expiry, sessionId: storedSessionId } = JSON.parse(authData);
      const now = Date.now();
      
      // Verify it's for the correct session
      if (storedSessionId !== sessionId) {
        localStorage.removeItem(key);
        return false;
      }
      
      // Check if authentication is still valid (expires after session ends + 1 hour buffer)
      if (now > expiry) {
        localStorage.removeItem(key);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking device authentication:', error);
      localStorage.removeItem(key);
      return false;
    }
  };

  // Helper function to store device authentication for this session
  const storeDeviceAuthentication = (sessionId) => {
    if (!sessionId) return;
    
    const key = `session_auth_${sessionId}`;
    
    // Calculate expiry based on session end time + 1 hour buffer
    // If session end time is not available, default to 24 hours from now
    let expiry = Date.now() + (24 * 60 * 60 * 1000); // Default: 24 hours
    
    if (session?.endTime) {
      const sessionEndTime = new Date(session.endTime).getTime();
      const bufferTime = 60 * 60 * 1000; // 1 hour buffer
      expiry = sessionEndTime + bufferTime;
      
      // Ensure expiry is at least 1 hour from now
      const minExpiry = Date.now() + bufferTime;
      if (expiry < minExpiry) {
        expiry = minExpiry;
      }
    }
    
    const authData = {
      timestamp: Date.now(),
      expiry: expiry,
      sessionId: sessionId,
      sessionTheme: session?.theme || 'Unknown Session'
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(authData));
      console.log(`Device authenticated for session ${sessionId} until ${new Date(expiry).toLocaleString()}`);
    } catch (error) {
      console.error('Error storing device authentication:', error);
    }
  };

  // Helper function to clear device authentication for this session (kept for backward compatibility but not used)
  const clearDeviceAuthentication = (sessionId) => {
    const key = `session_auth_${sessionId}`;
    localStorage.removeItem(key);
    setFormData({
      memberCode: '',
    });
    showSuccess('Form reset.');
  };

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      // Prevent duplicate API calls in React Strict Mode
      if (sessionFetchedRef.current || sessionFetchInProgressRef.current) {
        return;
      }

      sessionFetchInProgressRef.current = true;

      try {
        setLoading(true);
        const response = await apiService.getSessionInfo(sessionId);
        console.log('Session info response:', response);
        
        // Handle the response structure
        const sessionData = response?.data?.session || response?.session || response;
        if (sessionData) {
          setSession(sessionData);
          sessionFetchedRef.current = true;
          
          // Secret question step removed - always go directly to member code entry
          setStep(2);
        } else {
          console.log('No session data found in response:', response);
          setSession(null);
        }
      } catch (error) {
        console.error('Failed to fetch session info:', error);
        setSession(null);
      } finally {
        setLoading(false);
        sessionFetchInProgressRef.current = false;
      }
    };

    fetchSessionData();
  }, [sessionId, showSuccess]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Secret answer submission removed - no longer required

  const handleMemberCodeSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);

    try {
      // Call the real API to submit attendance
      const response = await apiService.checkInWithPin(sessionId, formData.memberCode);
      
      if (response.success) {
        const memberData = response.data?.member;
        setCheckedInMember({
          firstName: memberData?.name?.split(' ')[0] || 'Member',
          lastName: memberData?.name?.split(' ').slice(1).join(' ') || '',
        });
        // Store member details for display (PIN and email)
        setMemberDetails({
          pin: memberData?.pin || formData.memberCode,
          email: memberData?.email || '',
          name: memberData?.name || ''
        });
        setCheckInSuccess(true);
        showSuccess(response.message || 'Welcome! You have been checked in successfully.');
      } else {
        showError(response.message || 'Invalid member code. Please check your 4-digit code.');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to check in. Please try again.';
      showError(errorMessage);
    } finally {
      setChecking(false);
    }
  };


  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-red-500 mb-3 sm:mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-sm sm:text-base text-gray-600">
            The session you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  if (checkInSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-green-500 mb-3 sm:mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Check-In Successful!</h1>
          <p className="text-base sm:text-lg text-gray-700 mb-3 sm:mb-4">
            Welcome, <span className="font-semibold">{checkedInMember.firstName}</span>!
          </p>
          
          {/* Member Details (PIN and Email) */}
          {memberDetails && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 text-left">
              <h4 className="text-xs sm:text-sm font-semibold text-indigo-900 mb-2">Your Member Information</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                {memberDetails.pin && (
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-700 font-medium">4-Digit PIN:</span>
                    <span className="text-indigo-900 font-mono font-bold text-base sm:text-lg bg-white px-2 py-1 rounded border border-indigo-300">
                      {memberDetails.pin}
                    </span>
                  </div>
                )}
                {memberDetails.email && (
                  <div className="flex items-start">
                    <span className="text-indigo-700 font-medium mr-2">Email:</span>
                    <span className="text-indigo-900 break-all">{memberDetails.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-left">
            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">{session.theme}</h3>
            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="break-words">{formatDateTime(session.startTime)}</span>
              </div>
              {session.location && (
                <div className="flex items-start">
                  <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{session.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <QrCodeIcon className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-indigo-600 mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Check In</h1>
            <p className="text-sm sm:text-base text-gray-600">Welcome! Please check in to join the session.</p>
          </div>

          {/* Session Info */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">{session.theme}</h2>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex items-center text-gray-600">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-indigo-600 flex-shrink-0" />
                <span className="break-words">{formatDateTime(session.startTime)}</span>
              </div>
              {session.endTime && (
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-indigo-600 flex-shrink-0" />
                  <span>Ends at {new Date(session.endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}</span>
                </div>
              )}
              {session.location && (
                <div className="flex items-start text-gray-600">
                  <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{session.location}</span>
                </div>
              )}
            </div>
            {session.description && (
              <p className="mt-3 sm:mt-4 text-gray-600 text-xs sm:text-sm">{session.description}</p>
            )}
          </div>

          {/* Member Check-in */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Member Code Check-in */}
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Enter Your Member Code
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Please enter the 4-digit member code that was sent to your email.
                </p>
                <form onSubmit={handleMemberCodeSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="memberCode" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Member Code
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="memberCode"
                      id="memberCode"
                      maxLength="4"
                      pattern="[0-9]{4}"
                      value={formData.memberCode}
                      onChange={handleChange}
                      className="w-full px-3 py-3 sm:py-2.5 text-center text-2xl sm:text-3xl font-mono border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1234"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={checking || formData.memberCode.length !== 4}
                    className="w-full px-4 py-3 sm:py-2.5 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {checking ? 'Checking In...' : 'Check In'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact a church administrator or volunteer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;