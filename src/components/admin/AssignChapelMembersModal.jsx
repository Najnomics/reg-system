import { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';

const AssignChapelMembersModal = ({ chapel, type, onSubmit, onClose }) => {
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const membersResponse = await (async () => {
        let allMembersList = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await apiService.getMembers({ page, limit: 100 });
          const pageMembers = response?.data?.members || [];
          allMembersList = [...allMembersList, ...pageMembers];

          hasMore = pageMembers.length === 100 && (response?.data?.pagination?.hasNext || false);
          page++;

          if (page > 50) break;
        }

        return allMembersList;
      })();

      const eligibleMembers = membersResponse.filter(member => {
        if (!member.chapel) return true;
        return member.chapel.id === chapel.id;
      });

      setMembers(eligibleMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleToggleMember = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSubmit = () => {
    if (selectedMembers.size === 0) {
      return;
    }
    onSubmit(Array.from(selectedMembers));
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const title = type === 'invitees' ? 'Assign Invitees' : 'Assign Members';
  const description = type === 'invitees'
    ? 'Select people to mark as invitees for this chapel'
    : 'Select people to assign as chapel members';

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] my-auto flex flex-col">
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">{title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{description}</p>
            <p className="text-xs sm:text-sm font-medium text-gray-900 mt-2 break-words">
              Chapel: {chapel.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 flex-shrink-0 touch-manipulation"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <div className="relative mb-3 sm:mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 sm:pl-10 w-full text-sm sm:text-base"
            />
          </div>

          {selectedMembers.size > 0 && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs sm:text-sm font-medium text-blue-900">
                {selectedMembers.size} member(s) selected
              </p>
            </div>
          )}

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-500">No members found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleToggleMember(member.id)}
                  className={`flex items-center justify-between p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors touch-manipulation gap-2 ${
                    selectedMembers.has(member.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{member.name}</p>
                    <p className="text-xs sm:text-sm text-gray-600 break-words truncate">{member.email}</p>
                    {member.chapel?.id === chapel.id && member.chapelRole && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {member.chapelRole === 'INVITEE' ? 'Invitee' : 'Member'}
                      </p>
                    )}
                  </div>
                  {selectedMembers.has(member.id) && (
                    <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            disabled={loading || selectedMembers.size === 0}
          >
            {loading ? 'Assigning...' : `Assign ${selectedMembers.size} ${type === 'invitees' ? 'Invitee(s)' : 'Member(s)'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignChapelMembersModal;
