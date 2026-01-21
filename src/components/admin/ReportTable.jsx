import { format } from 'date-fns';

const ReportTable = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading report data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">No attendance records</h3>
        <p className="text-sm text-gray-500">There are no attendance records for the selected criteria.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {data.map((record, index) => (
          <div key={record.id || index} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Member</p>
                <p className="text-sm font-medium text-gray-900">
                  {record.member?.firstName} {record.member?.lastName}
                </p>
                <p className="text-xs text-gray-600 mt-1">{record.member?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Session</p>
                <p className="text-sm text-gray-900">{record.session?.theme || 'Unknown Session'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Check-in Time</p>
                  <p className="text-sm text-gray-900">
                    {record.checkedInAt ? format(new Date(record.checkedInAt), 'h:mm a') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm text-gray-900">
                    {record.checkedInAt ? format(new Date(record.checkedInAt), 'MMM dd, yyyy') : '-'}
                  </p>
                </div>
              </div>
              <div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Present
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Member
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Session
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Check-in Time
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((record, index) => (
            <tr key={record.id || index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {record.member?.firstName?.[0]}{record.member?.lastName?.[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {record.member?.firstName} {record.member?.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.member?.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {record.session?.theme || 'Unknown Session'}
                </div>
                <div className="text-sm text-gray-500">
                  {record.session?.location && `Location: ${record.session.location}`}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.checkedInAt ? format(new Date(record.checkedInAt), 'h:mm a') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {record.checkedInAt ? format(new Date(record.checkedInAt), 'MMM dd, yyyy') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Present
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination would go here if needed */}
      {data.length > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{data.length}</span> of{' '}
                <span className="font-medium">{data.length}</span> results
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default ReportTable;