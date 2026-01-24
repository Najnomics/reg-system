import { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, UsersIcon, UserGroupIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import AssignMembersModal from './AssignMembersModal';

const ChariotDetailModal = ({ chariot, onClose, onRefresh }) => {
  const { showError, showSuccess } = useApp();
  const { userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [loading, setLoading] = useState(false);
  const [currentChariot, setCurrentChariot] = useState(chariot);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState(null); // 'assistants' or 'members'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChariotData();
  }, [chariot.id]);

  const loadChariotData = async () => {
    try {
      const response = await apiService.getChariot(chariot.id);
      setCurrentChariot(response?.data?.chariot || chariot);
    } catch (error) {
      console.error('Failed to load chariot:', error);
    }
  };

  const handleRemoveAssistant = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this assistant?')) return;
    
    try {
      setLoading(true);
      await apiService.removeChariotAssistants(currentChariot.id, [memberId]);
      showSuccess('Assistant removed successfully');
      await loadChariotData();
      if (onRefresh) onRefresh();
    } catch (error) {
      showError('Failed to remove assistant');
      console.error('Remove assistant error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      setLoading(true);
      await apiService.removeChariotMembers(currentChariot.id, [memberId]);
      showSuccess('Member removed successfully');
      await loadChariotData();
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
      if (assignType === 'assistants') {
        await apiService.addChariotAssistants(currentChariot.id, memberIds);
        showSuccess('Assistants assigned successfully');
      } else if (assignType === 'members') {
        await apiService.addChariotMembers(currentChariot.id, memberIds);
        showSuccess('Members assigned successfully');
      }
      setShowAssignModal(false);
      setAssignType(null);
      await loadChariotData();
      if (onRefresh) onRefresh();
    } catch (error) {
      showError(error.message || `Failed to assign ${assignType}`);
      console.error('Assign error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChapelRole = (role) => {
    if (role === 'INVITEE') return 'Invitee';
    if (role === 'WORKER') return 'Worker';
    return 'Member';
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filterBySearch = (member) => {
    if (!normalizedSearch) return true;
    return (
      member?.name?.toLowerCase().includes(normalizedSearch) ||
      member?.email?.toLowerCase().includes(normalizedSearch)
    );
  };

  const filteredAssistants = (currentChariot.assistants || []).filter((assistant) =>
    filterBySearch(assistant.member)
  );
  const filteredMembers = (currentChariot.members || []).filter((memberEntry) =>
    filterBySearch(memberEntry.member)
  );

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] my-auto overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">{currentChariot.name}</h3>
            {currentChariot.description && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{currentChariot.description}</p>
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
            <label htmlFor="chariot-member-search" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Search members
            </label>
            <input
              id="chariot-member-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>
          {/* Leader */}
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Leader</h4>
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{currentChariot.leader?.name}</p>
              <p className="text-xs sm:text-sm text-gray-600 break-words">{currentChariot.leader?.email}</p>
            </div>
          </div>

          {/* Assistants */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Assistants ({filteredAssistants.length})
                </h4>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleAssign('assistants')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 sm:gap-2 touch-manipulation w-full sm:w-auto"
                  disabled={loading}
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Assistants</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
            {filteredAssistants.length > 0 ? (
              <div className="space-y-2">
                {filteredAssistants.map((assistant) => (
                  <div
                    key={assistant.member.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{assistant.member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{assistant.member.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assistant.member.chapel
                          ? `Chapel: ${assistant.member.chapel.name} (${formatChapelRole(assistant.member.chapelRole)})`
                          : 'Chapel: Not assigned'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveAssistant(assistant.member.id)}
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
              <p className="text-xs sm:text-sm text-gray-500 p-3 sm:p-4 bg-gray-50 rounded-lg">No assistants assigned</p>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Members ({filteredMembers.length})
                </h4>
              </div>
              {isAdmin && (
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
            {filteredMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredMembers.map((chariotMember) => (
                  <div
                    key={chariotMember.member.id}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{chariotMember.member.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{chariotMember.member.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {chariotMember.member.chapel
                          ? `Chapel: ${chariotMember.member.chapel.name} (${formatChapelRole(chariotMember.member.chapelRole)})`
                          : 'Chapel: Not assigned'}
                      </p>
                      {chariotMember.member.pin && (
                        <p className="text-xs text-gray-500">PIN: {chariotMember.member.pin}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRemoveMember(chariotMember.member.id)}
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
        </div>

        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation">
            Close
          </button>
        </div>
      </div>

      {/* Assign Members Modal */}
      {showAssignModal && (
        <AssignMembersModal
          chariot={currentChariot}
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

export default ChariotDetailModal;
