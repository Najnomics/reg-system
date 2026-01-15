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
  const [step, setStep] = useState(1); // 1: Secret answer, 2: Member code
  const [formData, setFormData] = useState({
    secretAnswer: '',
    memberCode: '',
    firstName: '',
    lastName: '',
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

  // Helper function to clear device authentication for this session
  const clearDeviceAuthentication = (sessionId) => {
    const key = `session_auth_${sessionId}`;
    localStorage.removeItem(key);
    setStep(1);
    setFormData({
      secretAnswer: '',
      memberCode: '',
      firstName: '',
      lastName: '',
    });
    showSuccess('Device authentication cleared. Please answer the security question.');
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
          
          // Check if device is already authenticated for this session
          if (isDeviceAuthenticated(sessionId)) {
            console.log('Device already authenticated for this session, skipping secret question');
            setStep(2); // Skip secret answer step
            showSuccess('Welcome back! Device already authenticated for this session.');
          }
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

  const handleSecretAnswerSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);

    try {
      const response = await apiService.verifySecretAnswer(sessionId, formData.secretAnswer);
      
      if (response.correct) {
        // Store device authentication for this session
        storeDeviceAuthentication(sessionId);
        console.log('Device authenticated for session', sessionId);
        
        setStep(2);
        showSuccess('Answer verified! Please enter your member PIN.');
      } else {
        showError(response.message || 'Incorrect answer. Please try again.');
      }
    } catch (error) {
      console.error('Secret answer verification error:', error);
      showError(error.message || 'Failed to verify answer. Please try again.');
    } finally {
      setChecking(false);
    }
  };

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
          isGuest: false
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

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        showError('Please enter both first and last name.');
        setChecking(false);
        return;
      }

      // Mock API call for manual check-in
      await new Promise(resolve => setTimeout(resolve, 1500));

      const guestMember = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        isGuest: true,
      };

      setCheckedInMember(guestMember);
      setCheckInSuccess(true);
      showSuccess(`Welcome, ${guestMember.firstName}! You have been checked in as a guest.`);
    } catch (error) {
      showError('Failed to check in. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600">
            The session you're looking for doesn't exist or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  if (checkInSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check-In Successful!</h1>
          <p className="text-lg text-gray-700 mb-4">
            Welcome, <span className="font-semibold">{checkedInMember.firstName}</span>!
          </p>
          {checkedInMember.isGuest && (
            <p className="text-sm text-gray-600 mb-4">
              Thank you for joining us as our guest today.
            </p>
          )}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">{session.theme}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {formatDateTime(session.startTime)}
              </div>
              {session.location && (
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  {session.location}
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <QrCodeIcon className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Check In</h1>
            <p className="text-gray-600">Welcome! Please check in to join the session.</p>
          </div>

          {/* Session Info */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{session.theme}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center text-gray-600">
                <CalendarIcon className="h-5 w-5 mr-3 text-indigo-600" />
                {formatDateTime(session.startTime)}
              </div>
              {session.endTime && (
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="h-5 w-5 mr-3 text-indigo-600" />
                  Ends at {new Date(session.endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              )}
              {session.location && (
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="h-5 w-5 mr-3 text-indigo-600" />
                  {session.location}
                </div>
              )}
            </div>
            {session.description && (
              <p className="mt-4 text-gray-600 text-sm">{session.description}</p>
            )}
          </div>

          {/* Step 1: Security Question */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Answer Security Question
              </h3>
              <div className="bg-blue-50 p-4 rounded-md mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Security Question:
                </p>
                <p className="text-blue-800">
                  {session.secretQuestion}
                </p>
              </div>
              <form onSubmit={handleSecretAnswerSubmit} className="space-y-4">
                <div>
                  <label htmlFor="secretAnswer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <input
                    type="text"
                    name="secretAnswer"
                    id="secretAnswer"
                    value={formData.secretAnswer}
                    onChange={handleChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your answer"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={checking || !formData.secretAnswer.trim()}
                  className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {checking ? 'Verifying...' : 'Continue'}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Member Check-in */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Device Authentication Status */}
              {isDeviceAuthenticated(sessionId) && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Device Authenticated
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        This device has already answered the security question for this session.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Member Code Check-in */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Step 2: Enter Your Member Code
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please enter the 4-digit member code that was sent to your email.
                </p>
                <form onSubmit={handleMemberCodeSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="memberCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Member Code
                    </label>
                    <input
                      type="text"
                      name="memberCode"
                      id="memberCode"
                      maxLength="4"
                      pattern="[0-9]{4}"
                      value={formData.memberCode}
                      onChange={handleChange}
                      className="w-full text-center text-2xl font-mono border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1234"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={checking || formData.memberCode.length !== 4}
                    className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {checking ? 'Checking In...' : 'Check In'}
                  </button>
                </form>
              </div>

              {/* Guest Check-in */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Don't have a member code? Check in as Guest
                </h3>
                <form onSubmit={handleGuestSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={checking || !formData.firstName.trim() || !formData.lastName.trim()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {checking ? 'Checking In...' : 'Check In as Guest'}
                  </button>
                </form>
              </div>

              {/* Back Button / Reset Authentication */}
              <div className="text-center">
                <button
                  onClick={() => clearDeviceAuthentication(sessionId)}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  ← Reset Device Authentication
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Clear this device's authentication for this session
                </p>
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