import { useState } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  QrCodeIcon,
  EyeIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon 
} from '@heroicons/react/24/outline';
import { sessionService } from '../../services/sessionService';
import { format } from 'date-fns';

const SessionList = ({ sessions, onEdit, onShowQRCode, loading, type }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (session) => {
    if (window.confirm(`Are you sure you want to delete the session "${session.theme}"?`)) {
      setDeletingId(session.id);
      try {
        await sessionService.deleteSession(session.id);
        window.location.reload();
      } catch (error) {
        alert(error.message);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDownloadQR = async (session) => {
    try {
      await sessionService.downloadQRCode(session.id);
    } catch (error) {
      alert(error.message);
    }
  };

  const getStatusColor = (session) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    if (now < startTime) {
      return 'bg-blue-100 text-blue-800';
    } else if (now >= startTime && now <= endTime) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (session) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    if (now < startTime) {
      return 'Upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'Active';
    } else {
      return 'Completed';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
        <p className="mt-1 text-sm text-gray-500">
          {type === 'active' && 'No sessions are currently active.'}
          {type === 'upcoming' && 'No upcoming sessions scheduled.'}
          {type === 'past' && 'No past sessions found.'}
          {!type && 'Get started by creating a new session.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <div 
          key={session.id} 
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {session.theme}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session)}`}>
                {getStatusText(session)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                <span>
                  {format(new Date(session.startTime), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                <span>
                  {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
                </span>
              </div>

              {session._count?.attendance !== undefined && (
                <div className="flex items-center text-sm text-gray-500">
                  <UsersIcon className="flex-shrink-0 mr-2 h-4 w-4" />
                  <span>{session._count.attendance} attendees</span>
                </div>
              )}

              {session.securityQuestion && (
                <div className="text-sm text-gray-500">
                  <strong>Question:</strong> {session.securityQuestion}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => onShowQRCode(session)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="View QR Code"
                >
                  <QrCodeIcon className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDownloadQR(session)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Download QR Code"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(session)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Edit session"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDelete(session)}
                  disabled={deletingId === session.id}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  title="Delete session"
                >
                  {deletingId === session.id ? (
                    <div className="animate-spin h-4 w-4 border-b-2 border-red-600 rounded-full"></div>
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SessionList;