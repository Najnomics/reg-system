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
  UserIcon,
  UsersIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import ChariotForm from './ChariotForm';
import ChariotDetailModal from './ChariotDetailModal';
import AssignMembersModal from './AssignMembersModal';

const ChariotList = () => {
  const { showError, showSuccess } = useApp();
  const { userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [chariots, setChariots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingChariot, setEditingChariot] = useState(null);
  const [selectedChariot, setSelectedChariot] = useState(null);
  const [assignType, setAssignType] = useState(null); // 'leader', 'assistants', 'members'
  const [formLoading, setFormLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'single' | 'bulk'
  const [chariotToDelete, setChariotToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedChariots, setSelectedChariots] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const loadChariots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getChariots();
      setChariots(response?.data?.chariots || []);
    } catch (error) {
      showError('Failed to load chariots');
      console.error('Load chariots error:', error);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadChariots();
  }, [loadChariots]);

  const handleCreate = () => {
    setEditingChariot(null);
    setShowForm(true);
  };

  const handleEdit = (chariot) => {
    setEditingChariot(chariot);
    setShowForm(true);
  };

  const handleView = async (chariot) => {
    try {
      const response = await apiService.getChariot(chariot.id);
      setSelectedChariot(response?.data?.chariot || chariot);
      setShowDetailModal(true);
    } catch (error) {
      showError('Failed to load chariot details');
      console.error('Load chariot error:', error);
    }
  };

  const handleAssign = (chariot, type) => {
    setSelectedChariot(chariot);
    setAssignType(type);
    setShowAssignModal(true);
  };

  const handleSubmit = async (data) => {
    try {
      setFormLoading(true);
      let response;
      
      if (editingChariot) {
        response = await apiService.updateChariot(editingChariot.id, data);
      } else {
        response = await apiService.createChariot(data);
      }

      showSuccess(`Chariot ${editingChariot ? 'updated' : 'created'} successfully`);
      setShowForm(false);
      setEditingChariot(null);
      await loadChariots();
    } catch (error) {
      showError(error.message || `Failed to ${editingChariot ? 'update' : 'create'} chariot`);
      console.error('Chariot form submit error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (chariot) => {
    setChariotToDelete(chariot);
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
        const chariotIds = Array.from(selectedChariots);
        if (chariotIds.length === 0) return;
        const results = await Promise.allSettled(
          chariotIds.map((chariotId) => apiService.deleteChariot(chariotId))
        );
        const failed = results.filter(result => result.status === 'rejected').length;
        const successCount = chariotIds.length - failed;
        if (failed === 0) {
          showSuccess(`Deleted ${successCount} chariot(s) successfully`);
        } else {
          showError(`Deleted ${successCount} chariot(s); ${failed} failed. Check console for details.`);
          results
            .filter(result => result.status === 'rejected')
            .forEach(result => console.error('Delete chariot error:', result.reason));
        }
        setSelectedChariots(new Set());
        setSelectAll(false);
      } else {
        if (!chariotToDelete) return;
        await apiService.deleteChariot(chariotToDelete.id);
        showSuccess('Chariot deleted successfully');
      }
      setDeleteModalOpen(false);
      setChariotToDelete(null);
      setDeleteType(null);
      setDeleteConfirmText('');
      await loadChariots();
    } catch (error) {
      showError('Failed to delete chariot');
      console.error('Delete chariot error:', error);
    }
  };

  const handleSelectChariot = (chariotId) => {
    setSelectedChariots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chariotId)) {
        newSet.delete(chariotId);
      } else {
        newSet.add(chariotId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedChariots(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredChariots.map(chariot => chariot.id));
      setSelectedChariots(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = () => {
    if (selectedChariots.size === 0) {
      showError('Please select at least one chariot to delete');
      return;
    }
    setDeleteConfirmText('');
    setDeleteType('bulk');
    setDeleteModalOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const blob = await apiService.exportChariotsPDF();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chariots_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Failed to export chariots PDF');
      console.error('Export chariots PDF error:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      const blob = await apiService.exportChariotsCSV();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chariots_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Failed to export chariots CSV');
      console.error('Export chariots CSV error:', error);
    } finally {
      setExportingCSV(false);
    }
  };

  const handleAssignSubmit = async (memberIds) => {
    if (!selectedChariot || !assignType || memberIds.length === 0) return;

    try {
      if (assignType === 'assistants') {
        await apiService.addChariotAssistants(selectedChariot.id, memberIds);
        showSuccess(`Added ${memberIds.length} assistant(s) to chariot`);
      } else if (assignType === 'members') {
        await apiService.addChariotMembers(selectedChariot.id, memberIds);
        showSuccess(`Added ${memberIds.length} member(s) to chariot`);
      }
      setShowAssignModal(false);
      setSelectedChariot(null);
      setAssignType(null);
      await loadChariots();
    } catch (error) {
      showError(`Failed to assign ${assignType}`);
      console.error('Assign error:', error);
    }
  };

  // Memoize filtered chariots to avoid recalculating on every render
  const filteredChariots = useMemo(() => {
    if (!searchTerm.trim()) return chariots;
    const term = searchTerm.toLowerCase();
    return chariots.filter(chariot =>
      chariot.name.toLowerCase().includes(term) ||
      chariot.leader?.name?.toLowerCase().includes(term) ||
      chariot.leader?.email?.toLowerCase().includes(term) ||
      (chariot.assistants || []).some(({ member }) =>
        member?.name?.toLowerCase().includes(term)
      ) ||
      (chariot.members || []).some(({ member }) =>
        member?.name?.toLowerCase().includes(term)
      )
    );
  }, [chariots, searchTerm]);

  useEffect(() => {
    if (filteredChariots.length > 0) {
      const allSelected = filteredChariots.every(chariot => selectedChariots.has(chariot.id));
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [filteredChariots, selectedChariots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Chariots</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Manage chariot groups, leaders, assistants, and members
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
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="px-3 sm:px-4 py-2 bg-white text-gray-700 text-xs sm:text-sm font-medium rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{exportingCSV ? 'Exporting...' : 'Export CSV'}</span>
            <span className="sm:hidden">CSV</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Create Chariot</span>
              <span className="sm:hidden">Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search chariots by name, leader, or member..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-9 sm:pl-10 w-full sm:max-w-md text-sm sm:text-base"
        />
      </div>

      {isAdmin && selectedChariots.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center text-sm font-medium text-blue-900">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
              />
              {selectedChariots.size} chariot{selectedChariots.size !== 1 ? 's' : ''} selected
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

      {/* Chariots Grid */}
      {filteredChariots.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 px-4">
          <UserGroupIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No chariots</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {searchTerm ? 'No chariots match your search.' : 'Get started by creating a new chariot.'}
          </p>
          {!searchTerm && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md border border-indigo-600 shadow-sm hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
              >
                <PlusIcon className="h-5 w-5 mr-2 inline" />
                Create Chariot
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredChariots.map((chariot) => (
            <div key={chariot.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedChariots.has(chariot.id)}
                          onChange={() => handleSelectChariot(chariot.id)}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      )}
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{chariot.name}</h3>
                    </div>
                    {chariot.description && (
                      <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2 break-words">{chariot.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {chariot.isActive ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Leader */}
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-900">Leader</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 break-words">{chariot.leader?.name}</p>
                  <p className="text-xs text-gray-600 break-words truncate">{chariot.leader?.email}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chariot._count?.assistants || chariot.assistants?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Assistants</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg font-semibold text-gray-900">
                      {chariot._count?.members || chariot.members?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600">Members</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleView(chariot)}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center touch-manipulation"
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(chariot)}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center touch-manipulation"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(chariot)}
                        className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center touch-manipulation"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Quick Assign */}
                {isAdmin && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleAssign(chariot, 'assistants')}
                        className="px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-1 flex items-center justify-center gap-1 touch-manipulation"
                      >
                        <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Add Assistants</span>
                        <span className="sm:hidden">Assistants</span>
                      </button>
                      <button
                        onClick={() => handleAssign(chariot, 'members')}
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

      {/* Modals */}
      {showForm && (
        <ChariotForm
          chariot={editingChariot}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingChariot(null);
          }}
          loading={formLoading}
        />
      )}

      {showDetailModal && selectedChariot && (
        <ChariotDetailModal
          chariot={selectedChariot}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedChariot(null);
          }}
          onRefresh={loadChariots}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Chariot</h3>
              <p className="text-sm text-gray-600 mb-4">
                {deleteType === 'bulk'
                  ? `Are you sure you want to delete ${selectedChariots.size} chariot(s)? This action cannot be undone.`
                  : `Are you sure you want to delete "${chariotToDelete?.name || 'this chariot'}"? This action cannot be undone.`}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Type <strong>"delete"</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmText.toLowerCase() === 'delete') {
                    confirmDelete();
                  }
                }}
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setChariotToDelete(null);
                    setDeleteType(null);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedChariot && (
        <AssignMembersModal
          chariot={selectedChariot}
          type={assignType}
          onSubmit={handleAssignSubmit}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedChariot(null);
            setAssignType(null);
          }}
        />
      )}
    </div>
  );
};

export default ChariotList;
