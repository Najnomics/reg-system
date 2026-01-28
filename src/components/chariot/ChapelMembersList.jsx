import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';

const ChapelMembersList = () => {
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
  const [roleSummary, setRoleSummary] = useState({
    invitees: 0,
    members: 0,
    workers: 0,
  });
  const [chapelTotals, setChapelTotals] = useState({
    total: 0,
    members: 0,
    workers: 0,
    invitees: 0,
  });

  useEffect(() => {
    loadMembers();
  }, [pagination.page, searchTerm]);

  useEffect(() => {
    loadChapelTotals();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapelOnlyMembers({
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
      const summary = response?.data?.summary;
      if (summary) {
        setRoleSummary({
          invitees: summary.invitees || 0,
          members: summary.members || 0,
          workers: summary.workers || 0,
        });
      } else {
        const fallback = (response?.data?.members || []).reduce(
          (acc, member) => {
            if (member.chapelRole === 'INVITEE') {
              acc.invitees += 1;
            } else if (member.chapelRole === 'WORKER') {
              acc.workers += 1;
            } else {
              acc.members += 1;
            }
            return acc;
          },
          { invitees: 0, members: 0, workers: 0 }
        );
        setRoleSummary(fallback);
      }
    } catch (error) {
      showError('Failed to load chapel members');
      console.error('Load chapel members error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapelTotals = async () => {
    try {
      const response = await apiService.getChariotDashboardStats(true);
      const data = response?.data || {};
      setChapelTotals({
        total: data.totalChapelMembers || 0,
        members: data.totalChapelMembersByRole || 0,
        workers: data.totalChapelWorkers || 0,
        invitees: data.totalChapelInvitees || 0,
      });
    } catch (error) {
      console.error('Load chapel totals error:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatChapelRole = (role) => {
    if (role === 'INVITEE') return 'Invitee';
    if (role === 'WORKER') return 'Worker';
    if (role === 'CHAPEL_LEADER') return 'Chapel Leader';
    return 'Member';
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
          placeholder="Search chapel members..."
          value={searchTerm}
          onChange={handleSearch}
          className="input pl-9 sm:pl-10 w-full sm:max-w-md text-sm sm:text-base"
        />
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xs sm:text-sm text-blue-700">Chapel Members</div>
          <div className="text-lg sm:text-xl font-semibold text-blue-900">
            {chapelTotals.total || pagination.total}
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xs sm:text-sm text-amber-700">Workers</div>
          <div className="text-lg sm:text-xl font-semibold text-amber-900">
            {chapelTotals.workers || roleSummary.workers}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xs sm:text-sm text-indigo-700">Invitees</div>
          <div className="text-lg sm:text-xl font-semibold text-indigo-900">
            {chapelTotals.invitees || roleSummary.invitees}
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No chapel members found
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 hover:bg-gray-50">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 break-words">{member.name}</p>
                    <p className="text-xs text-gray-600 break-words mt-1">{member.email}</p>
                    <p className="text-xs text-gray-600 break-words mt-1">
                      {member.chapel
                        ? `Chapel: ${member.chapel.name} (${formatChapelRole(member.chapelRole)})`
                        : 'Chapel: Not assigned'}
                    </p>
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
                  Role
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
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No chapel members found
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
                      <div className="text-sm text-gray-600">
                        {formatChapelRole(member.chapelRole)}
                      </div>
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
                className="btn btn-sm btn-outline border border-gray-300 bg-white text-xs sm:text-sm px-3 sm:px-4 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="btn btn-sm btn-outline border border-gray-300 bg-white text-xs sm:text-sm px-3 sm:px-4 hover:bg-gray-50"
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

export default ChapelMembersList;
