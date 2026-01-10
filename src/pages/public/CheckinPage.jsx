import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
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
  const { sessions, members, showError, showSuccess } = useApp();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkedInMember, setCheckedInMember] = useState(null);
  const [formData, setFormData] = useState({
    pin: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    // Find session by ID
    const foundSession = sessions.find(s => s.id === parseInt(sessionId));
    if (foundSession) {
      setSession(foundSession);
    }
    setLoading(false);
  }, [sessionId, sessions]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);

    try {
      // Validate PIN
      const member = members.find(m => m.pin === formData.pin);
      
      if (!member) {
        showError('Invalid PIN. Please check your PIN and try again.');
        setChecking(false);
        return;
      }

      // Check if session is active
      const now = new Date();
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : null;

      if (now < startTime) {
        showError('This session has not started yet.');
        setChecking(false);
        return;
      }

      if (endTime && now > endTime) {
        showError('This session has already ended.');
        setChecking(false);
        return;
      }

      // Mock API call for check-in
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCheckedInMember(member);
      setCheckInSuccess(true);
      showSuccess(`Welcome, ${member.firstName}! You have been checked in successfully.`);
    } catch (error) {
      showError('Failed to check in. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleManualSubmit = async (e) => {
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

          {/* Check-in Methods */}
          <div className="space-y-6">
            {/* PIN Check-in */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Members: Check In with PIN
              </h3>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your 5-digit PIN
                  </label>
                  <input
                    type="text"
                    name="pin"
                    id="pin"
                    maxLength="5"
                    pattern="[0-9]{5}"
                    value={formData.pin}
                    onChange={handleChange}
                    className="w-full text-center text-2xl font-mono border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="12345"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={checking || formData.pin.length !== 5}
                  className="w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {checking ? 'Checking In...' : 'Check In'}
                </button>
              </form>
            </div>

            {/* Guest Check-in */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Guests: Check In Manually
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
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
          </div>

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