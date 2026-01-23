import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import ChapelForm from './ChapelForm';
import ChapelDetailModal from './ChapelDetailModal';
import AssignChapelMembersModal from './AssignChapelMembersModal';

const ChapelList = () => {
  const { showError, showSuccess } = useApp();
  const { userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [chapels, setChapels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingChapel, setEditingChapel] = useState(null);
  const [selectedChapel, setSelectedChapel] = useState(null);
  const [assignType, setAssignType] = useState(null); // 'invitees' | 'members'
  const [formLoading, setFormLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chapelToDelete, setChapelToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const loadChapels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getChapels();
      setChapels(response?.data?.chapels || []);
    } catch (error) {
      showError('Failed to load chapels');
      console.error('Load chapels error:', error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadChapels();
  }, [loadChapels]);

  const handleCreate = () => {
    setEditingChapel(null);
    setShowForm(true);
  };

  const handleEdit = (chapel) => {
    setEditingChapel(chapel);
    setShowForm(true);
  };

  const handleView = async (chapel) => {
    try {
      const response = await apiService.getChapel(chapel.id);
      setSelectedChapel(response?.data?.chapel || chapel);
      setShowDetailModal(true);
    } catch (error) {
      showError('Failed to load chapel details');
      console.error('Load chapel error:', error);
    }
  };

  const handleAssign = (chapel, type) => {
    setSelectedChapel(chapel);
    setAssignType(type);
    setShowAssignModal(true);
  };

  const handleSubmit = async (data) => {
    try {
      setFormLoading(true);
      if (editingChapel) {
        await apiService.updateChapel(editingChapel.id, data);
      } else {
        await apiService.createChapel(data);
      }

      showSuccess(`Chapel ${editingChapel ? 'updated' : 'created'} successfully`);
      setShowForm(false);
      setEditingChapel(null);
      await loadChapels();
    } catch (error) {
      showError(error.message || `Failed to ${editingChapel ? 'update' : 'create'} chapel`);
      console.error('Chapel form submit error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (chapel) => {
    setChapelToDelete(chapel);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      showError('Please type "delete" to confirm');
      return;
    }

    if (!chapelToDelete) return;

    try {
      await apiService.deleteChapel(chapelToDelete.id);
      showSuccess('Chapel deleted successfully');
      setDeleteModalOpen(false);
      setChapelToDelete(null);
      setDeleteConfirmText('');
      await loadChapels();
    } catch (error) {
      showError('Failed to delete chapel');
      console.error('Delete chapel error:', error);
    }
  };

  const handleAssignSubmit = async (memberIds) => {
    if (!selectedChapel || !assignType || memberIds.length === 0) return;

    try {
      const role = assignType === 'invitees' ? 'INVITEE' : 'MEMBER';
      await apiService.addChapelMembers(selectedChapel.id, memberIds, role);
      showSuccess(`Added ${memberIds.length} ${assignType === 'invitees' ? 'invitee(s)' : 'member(s)'} to chapel`);
      setShowAssignModal(false);
      setSelectedChapel(null);
      setAssignType(null);
      await loadChapels();
    } catch (error) {
      showError(`Failed to assign ${assignType}`);
      console.error('Assign error:', error);
    }
  };

  const filteredChapels = useMemo(() => {
    if (!searchTerm.trim()) return chapels;
    const term = searchTerm.toLowerCase();
    return chapels.filter(chapel =>
      chapel.name.toLowerCase().includes(term)
    );
  }, [chapels, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Chapels</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Manage chapels, invitees, and members
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleCreate}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Create Chapel</span>
            <span className="sm:hidden">Create</span>
          </button>
        )}
      </div>

      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search chapels by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-9 sm:pl-10 w-full sm:max-w-md text-sm sm:text-base"
        />
      </div>

      {filteredChapels.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 px-4">
          <UserGroupIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No chapels</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {searchTerm ? 'No chapels match your search.' : 'Get started by creating a new chapel.'}
          </p>
          {!searchTerm && isAdmin && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
              >
                <PlusIcon className="h-5 w-5 mr-2 inline" />
                Create Chapel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredChapels.map((chapel) => (
            <div key={chapel.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{chapel.name}</h3>
                    {chapel.description && (
                      <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2 break-words">{chapel.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {chapel.isActive ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole === 'INVITEE').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Invitees</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole !== 'INVITEE').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Members</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleView(chapel)}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center touch-manipulation"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(chapel)}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center touch-manipulation"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(chapel)}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center touch-manipulation"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {isAdmin && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleAssign(chapel, 'invitees')}
                        className="px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center gap-1 touch-manipulation"
                      >
                        <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Add Invitees</span>
                        <span className="sm:hidden">Invitees</span>
                      </button>
                      <button
                        onClick={() => handleAssign(chapel, 'members')}
                        className="px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center gap-1 touch-manipulation"
                      >
                        <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Add Members</span>
                        <span className="sm:hidden">Members</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ChapelForm
          chapel={editingChapel}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingChapel(null);
          }}
          loading={formLoading}
        />
      )}

      {showDetailModal && selectedChapel && (
        <ChapelDetailModal
          chapel={selectedChapel}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedChapel(null);
          }}
          onRefresh={loadChapels}
        />
      )}

      {showAssignModal && selectedChapel && (
        <AssignChapelMembersModal
          chapel={selectedChapel}
          type={assignType}
          onSubmit={handleAssignSubmit}
          onClose={() => {
            setShowAssignModal(false);
            setAssignType(null);
          }}
        />
      )}

      {deleteModalOpen && chapelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Chapel</h3>
              <p className="text-sm text-gray-600 mb-4">
                You are about to delete <strong>{chapelToDelete.name}</strong>. This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-2">Type <strong>delete</strong> to confirm:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                placeholder="delete"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setChapelToDelete(null);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapelList;
