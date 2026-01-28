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
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import ChapelForm from './ChapelForm';
import ChapelDetailModal from './ChapelDetailModal';
import AssignChapelMembersModal from './AssignChapelMembersModal';

const ChapelList = () => {
  const { showError, showSuccess } = useApp();
  const { userType, user } = useAuth();
  const isAdmin = userType === 'admin';
  const canAssignChapels = isAdmin || (userType === 'reg-rep' && user?.canAssignChapels);
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
  const [deleteType, setDeleteType] = useState(null); // 'single' | 'bulk'
  const [chapelToDelete, setChapelToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedChapels, setSelectedChapels] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

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
    setDeleteType('single');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      showError('Please type "delete" to confirm');
      return;
    }

    try {
      if (deleteType === 'bulk') {
        const chapelIds = Array.from(selectedChapels);
        if (chapelIds.length === 0) return;
        const results = await Promise.allSettled(
          chapelIds.map((chapelId) => apiService.deleteChapel(chapelId))
        );
        const failed = results.filter(result => result.status === 'rejected').length;
        const successCount = chapelIds.length - failed;
        if (failed === 0) {
          showSuccess(`Deleted ${successCount} chapel(s) successfully`);
        } else {
          showError(`Deleted ${successCount} chapel(s); ${failed} failed. Check console for details.`);
          results
            .filter(result => result.status === 'rejected')
            .forEach(result => console.error('Delete chapel error:', result.reason));
        }
        setSelectedChapels(new Set());
        setSelectAll(false);
      } else {
        if (!chapelToDelete) return;
        await apiService.deleteChapel(chapelToDelete.id);
        showSuccess('Chapel deleted successfully');
      }
      setDeleteModalOpen(false);
      setChapelToDelete(null);
      setDeleteType(null);
      setDeleteConfirmText('');
      await loadChapels();
    } catch (error) {
      showError('Failed to delete chapel');
      console.error('Delete chapel error:', error);
    }
  };

  const handleSelectChapel = (chapelId) => {
    setSelectedChapels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapelId)) {
        newSet.delete(chapelId);
      } else {
        newSet.add(chapelId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedChapels(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredChapels.map(chapel => chapel.id));
      setSelectedChapels(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = () => {
    if (selectedChapels.size === 0) {
      showError('Please select at least one chapel to delete');
      return;
    }
    setDeleteConfirmText('');
    setDeleteType('bulk');
    setDeleteModalOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const blob = await apiService.exportChapelsPDF();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chapels_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Failed to export chapels PDF');
      console.error('Export chapels PDF error:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleAssignSubmit = async (memberIds) => {
    if (!selectedChapel || !assignType || memberIds.length === 0) return;

    try {
      const role =
        assignType === 'invitees'
          ? 'INVITEE'
          : assignType === 'chapel_leaders'
            ? 'CHAPEL_LEADER'
            : 'MEMBER';
      await apiService.addChapelMembers(selectedChapel.id, memberIds, role);
      showSuccess(
        `Added ${memberIds.length} ${
          assignType === 'invitees' ? 'invitee(s)' : assignType === 'chapel_leaders' ? 'leader(s)' : 'member(s)'
        } to chapel`
      );
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

  useEffect(() => {
    if (filteredChapels.length > 0) {
      const allSelected = filteredChapels.every(chapel => selectedChapels.has(chapel.id));
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [filteredChapels, selectedChapels]);

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
            Manage chapels, invitees, members, workers, and chapel leaders
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="px-3 sm:px-4 py-2 bg-white text-gray-700 text-xs sm:text-sm font-medium rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{exportingPDF ? 'Exporting...' : 'Export PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
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

      {isAdmin && selectedChapels.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center text-sm font-medium text-blue-900">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
              />
              {selectedChapels.size} chapel{selectedChapels.size !== 1 ? 's' : ''} selected
            </label>
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 touch-manipulation"
            >
              <TrashIcon className="h-4 w-4 mr-1.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

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
                    <div className="flex items-start gap-2">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedChapels.has(chapel.id)}
                          onChange={() => handleSelectChapel(chapel.id)}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      )}
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{chapel.name}</h3>
                    </div>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole === 'INVITEE').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Invitees</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole === 'MEMBER').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Members</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole === 'WORKER').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Workers</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chapel.members?.filter(member => member.chapelRole === 'CHAPEL_LEADER').length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Leaders</div>
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

                {canAssignChapels && (
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
                      <button
                        onClick={() => handleAssign(chapel, 'chapel_leaders')}
                        className="px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center gap-1 touch-manipulation"
                      >
                        <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Add Leaders</span>
                        <span className="sm:hidden">Leaders</span>
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

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Chapel</h3>
              <p className="text-sm text-gray-600 mb-4">
                {deleteType === 'bulk'
                  ? `You are about to delete ${selectedChapels.size} chapel(s). This action cannot be undone.`
                  : `You are about to delete ${chapelToDelete?.name || 'this chapel'}. This action cannot be undone.`}
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
                    setDeleteType(null);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
