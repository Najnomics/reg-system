import { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, UsersIcon, UserGroupIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';
import AssignMembersModal from './AssignMembersModal';

const ChariotDetailModal = ({ chariot, onClose, onRefresh }) => {
  const { showError, showSuccess } = useApp();
  const [loading, setLoading] = useState(false);
  const [currentChariot, setCurrentChariot] = useState(chariot);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState(null); // 'assistants' or 'members'

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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{currentChariot.name}</h3>
            {currentChariot.description && (
              <p className="text-sm text-gray-600 mt-1">{currentChariot.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Leader */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Leader</h4>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-gray-900">{currentChariot.leader?.name}</p>
              <p className="text-sm text-gray-600">{currentChariot.leader?.email}</p>
              {currentChariot.leader?.phone && (
                <p className="text-sm text-gray-600">{currentChariot.leader.phone}</p>
              )}
            </div>
          </div>

          {/* Assistants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-green-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  Assistants ({currentChariot.assistants?.length || 0})
                </h4>
              </div>
              <button
                onClick={() => handleAssign('assistants')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                <PlusIcon className="h-4 w-4" />
                Add Assistants
              </button>
            </div>
            {currentChariot.assistants && currentChariot.assistants.length > 0 ? (
              <div className="space-y-2">
                {currentChariot.assistants.map((assistant) => (
                  <div
                    key={assistant.member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{assistant.member.name}</p>
                      <p className="text-sm text-gray-600">{assistant.member.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveAssistant(assistant.member.id)}
                      className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">No assistants assigned</p>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  Members ({currentChariot.members?.length || 0})
                </h4>
              </div>
              <button
                onClick={() => handleAssign('members')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading}
              >
                <PlusIcon className="h-4 w-4" />
                Add Members
              </button>
            </div>
            {currentChariot.members && currentChariot.members.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {currentChariot.members.map((chariotMember) => (
                  <div
                    key={chariotMember.member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{chariotMember.member.name}</p>
                      <p className="text-sm text-gray-600">{chariotMember.member.email}</p>
                      {chariotMember.member.pin && (
                        <p className="text-xs text-gray-500">PIN: {chariotMember.member.pin}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(chariotMember.member.id)}
                      className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">No members assigned</p>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
