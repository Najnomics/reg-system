import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const CheckinSuccess = ({ session, attendanceRecord, onStartOver }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>

        {/* Success Message */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Check-in Successful!
          </h3>
          <p className="text-lg text-gray-600">
            Welcome to <strong>{session.theme}</strong>
          </p>
        </div>

        {/* Attendance Details */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm space-y-2">
            {attendanceRecord?.member && (
              <div>
                <span className="text-gray-600">Checked in as:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {attendanceRecord.member.firstName} {attendanceRecord.member.lastName}
                </span>
              </div>
            )}
            
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-medium text-gray-900">
                {format(new Date(attendanceRecord?.checkedInAt || new Date()), 'h:mm a')}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium text-gray-900">
                {format(new Date(attendanceRecord?.checkedInAt || new Date()), 'MMMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-gray-600">
              Your attendance has been recorded successfully.
            </p>
          </div>

          {/* Session Info */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left">
              <div>
                <strong>Session:</strong> {session.theme}
              </div>
              <div>
                <strong>Duration:</strong> {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
              </div>
              {session.location && (
                <div className="md:col-span-2">
                  <strong>Location:</strong> {session.location}
                </div>
              )}
            </div>
          </div>

          {/* Attendance Count */}
          {session._count?.attendance && (
            <div className="text-sm text-gray-600">
              <p>
                You are attendee #{session._count.attendance + 1} for this session.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            <p>Thank you for attending! You may now close this page.</p>
          </div>

          <button
            onClick={onStartOver}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Check In Another Person
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you have any questions or need assistance, please contact an administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckinSuccess;