import { useState, useEffect } from 'react';
import { XMarkIcon, UsersIcon, UserGroupIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import AssignChapelMembersModal from './AssignChapelMembersModal';

const ChapelDetailModal = ({ chapel, onClose, onRefresh }) => {
  const { showError, showSuccess } = useApp();
  const { userType, user } = useAuth();
  const canAssignChapels = userType === 'admin' || (userType === 'reg-rep' && user?.canAssignChapels);
  const [loading, setLoading] = useState(false);
  const [currentChapel, setCurrentChapel] = useState(chapel);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState(null); // 'invitees' | 'members'

  useEffect(() => {
    loadChapelData();
  }, [chapel.id]);

  const loadChapelData = async () => {
    try {
      const response = await apiService.getChapel(chapel.id);
      setCurrentChapel(response?.data?.chapel || chapel);
    } catch (error) {
      console.error('Failed to load chapel:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this person from the chapel?')) return;

    try {
      setLoading(true);
      await apiService.removeChapelMembers(currentChapel.id, [memberId]);
      showSuccess('Member removed successfully');
      await loadChapelData();
      if (onRefresh) onRefresh();
    } catch (error) {
      showError('Failed to remove member');
      console.error('Remove member error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (type) => {
    setAssignType(type);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (memberIds) => {
    if (!assignType || memberIds.length === 0) return;

    try {
      setLoading(true);
      const role = assignType === 'invitees' ? 'INVITEE' : 'MEMBER';
      await apiService.addChapelMembers(currentChapel.id, memberIds, role);
      showSuccess(`${assignType === 'invitees' ? 'Invitees' : 'Members'} assigned successfully`);
      setShowAssignModal(false);
      setAssignType(null);
      await loadChapelData();
      if (onRefresh) onRefresh();
    } catch (error) {
      showError(error.message || `Failed to assign ${assignType}`);
      console.error('Assign error:', error);
    } finally {
      setLoading(false);
    }
  };

  const invitees = (currentChapel.members || []).filter(member => member.chapelRole === 'INVITEE');
  const chapelMembers = (currentChapel.members || []).filter(member => member.chapelRole === 'MEMBER');
  const chapelWorkers = (currentChapel.members || []).filter(member => member.chapelRole === 'WORKER');

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] my-auto overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">{currentChapel.name}</h3>
            {currentChapel.description && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{currentChapel.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 flex-shrink-0 touch-manipulation"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Invitees ({invitees.length})
                </h4>
              </div>
              {canAssignChapels && (
                <button
                  onClick={() => handleAssign('invitees')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 touch-manipulation w-full sm:w-auto"
                  disabled={loading}
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Invitees</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
            {invitees.length > 0 ? (
              <div className="space-y-2">
                {invitees.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{member.email}</p>
                    </div>
                    {canAssignChapels && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-2 py-1 text-xs sm:text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 touch-manipulation"
                        disabled={loading}
                      >
                        <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500 p-3 sm:p-4 bg-gray-50 rounded-lg">No invitees assigned</p>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Members ({chapelMembers.length})
                </h4>
              </div>
              {canAssignChapels && (
                <button
                  onClick={() => handleAssign('members')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 touch-manipulation w-full sm:w-auto"
                  disabled={loading}
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Members</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
            {chapelMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {chapelMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{member.email}</p>
                      {member.pin && (
                        <p className="text-xs text-gray-500">PIN: {member.pin}</p>
                      )}
                    </div>
                    {canAssignChapels && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-2 py-1 text-xs sm:text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 touch-manipulation"
                        disabled={loading}
                      >
                        <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500 p-3 sm:p-4 bg-gray-50 rounded-lg">No members assigned</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                Workers ({chapelWorkers.length})
              </h4>
            </div>
            {chapelWorkers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {chapelWorkers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{member.email}</p>
                      {member.pin && (
                        <p className="text-xs text-gray-500">PIN: {member.pin}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500 p-3 sm:p-4 bg-gray-50 rounded-lg">No workers assigned</p>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation">
            Close
          </button>
        </div>
      </div>

      {showAssignModal && (
        <AssignChapelMembersModal
          chapel={currentChapel}
          type={assignType}
          onSubmit={handleAssignSubmit}
          onClose={() => {
            setShowAssignModal(false);
            setAssignType(null);
          }}
        />
      )}
    </div>
  );
};

export default ChapelDetailModal;
