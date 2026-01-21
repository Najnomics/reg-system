import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';

const ChariotMembersList = () => {
  const { showError } = useApp();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    loadMembers();
  }, [pagination.page, searchTerm]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChariotMembers({
        page: pagination.page,
        limit: pagination.limit,
        query: searchTerm || undefined,
      });
      setMembers(response?.data?.members || []);
      setPagination(prev => ({
        ...prev,
        total: response?.data?.pagination?.total || 0,
        pages: response?.data?.pagination?.pages || 0,
      }));
    } catch (error) {
      showError('Failed to load members');
      console.error('Load members error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Search */}
      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={handleSearch}
          className="input pl-9 sm:pl-10 w-full sm:max-w-md text-sm sm:text-base"
        />
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No members found
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 hover:bg-gray-50">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 break-words">{member.name}</p>
                    <p className="text-xs text-gray-600 break-words mt-1">{member.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                    </div>
                    <div>
                      <span className="text-gray-500">PIN:</span>{' '}
                      <span className="font-mono text-gray-900">{member.pin}</span>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm">
                    <span className="text-gray-500">Attendance:</span>{' '}
                    <span className="text-gray-900">{member._count?.attendance || 0} sessions</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PIN
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.length === 0 ? (
                <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{member.pin}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {member._count?.attendance || 0} sessions
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-gray-50 px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} members
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-sm btn-outline text-xs sm:text-sm px-3 sm:px-4"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="btn btn-sm btn-outline text-xs sm:text-sm px-3 sm:px-4"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChariotMembersList;
