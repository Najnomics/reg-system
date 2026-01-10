import { CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

const SessionInfo = ({ session }) => {
  const now = new Date();
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);
  
  const isUpcoming = isBefore(now, startTime);
  const isActive = isAfter(now, startTime) && isBefore(now, endTime);
  const isPast = isAfter(now, endTime);

  const getStatusInfo = () => {
    if (isUpcoming) {
      return {
        color: 'bg-blue-100 text-blue-800',
        text: `Starts ${formatDistanceToNow(startTime, { addSuffix: true })}`,
        message: 'Check-in will be available when the session starts.'
      };
    } else if (isActive) {
      return {
        color: 'bg-green-100 text-green-800',
        text: `Ends ${formatDistanceToNow(endTime, { addSuffix: true })}`,
        message: 'Check-in is now open! Please complete the form below.'
      };
    } else {
      return {
        color: 'bg-gray-100 text-gray-800',
        text: 'Session ended',
        message: 'This session has ended and check-in is no longer available.'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <div className="p-6">
        {/* Header with Status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{session.theme}</h2>
            {session.description && (
              <p className="text-gray-600 mt-1">{session.description}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        {/* Status Message */}
        <div className={`p-4 rounded-md mb-4 ${
          isActive ? 'bg-green-50 border border-green-200' : 
          isUpcoming ? 'bg-blue-50 border border-blue-200' : 
          'bg-gray-50 border border-gray-200'
        }`}>
          <p className={`text-sm ${
            isActive ? 'text-green-700' : 
            isUpcoming ? 'text-blue-700' : 
            'text-gray-700'
          }`}>
            {statusInfo.message}
          </p>
        </div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <CalendarIcon className="flex-shrink-0 mr-3 h-5 w-5" />
              <span>{format(startTime, 'EEEE, MMMM dd, yyyy')}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="flex-shrink-0 mr-3 h-5 w-5" />
              <span>
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {session.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                <span>{session.location}</span>
              </div>
            )}

            {session._count?.attendance !== undefined && (
              <div className="flex items-center text-sm text-gray-600">
                <UsersIcon className="flex-shrink-0 mr-3 h-5 w-5" />
                <span>
                  {session._count.attendance} {session._count.attendance === 1 ? 'person' : 'people'} checked in
                  {session.maxAttendees && ` (${session.maxAttendees} max)`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        {(session.maxAttendees && session._count?.attendance >= session.maxAttendees) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Notice:</strong> This session has reached its maximum capacity. 
              Please check with an administrator if you need to check in.
            </p>
          </div>
        )}

        {/* Check-in Disabled Notice */}
        {(isUpcoming || isPast) && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-600">
              {isUpcoming && 'Check-in will become available when the session starts.'}
              {isPast && 'Check-in is no longer available for this session.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionInfo;