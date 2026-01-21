import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { apiService } from '../../services/apiService';
import RegRepForm from './RegRepForm';
import PasswordResetModal from './PasswordResetModal';

const RegRepList = () => {
  const { showError, showSuccess } = useApp();
  const [regReps, setRegReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingRegRep, setEditingRegRep] = useState(null);
  const [resetPasswordRegRep, setResetPasswordRegRep] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadRegReps();
  }, []);

  const loadRegReps = async () => {
    try {
      setLoading(true);
      const response = await apiService.getRegReps();
      setRegReps(response?.data?.regReps || []);
    } catch (error) {
      showError('Failed to load registration representatives');
      console.error('Load reg-reps error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRegRep(null);
    setShowForm(true);
  };

  const handleEdit = (regRep) => {
    setEditingRegRep(regRep);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    try {
      setFormLoading(true);
      let response;
      
      if (editingRegRep) {
        response = await apiService.updateRegRep(editingRegRep.id, data);
      } else {
        response = await apiService.createRegRep(data);
      }

      showSuccess(`Registration representative ${editingRegRep ? 'updated' : 'created'} successfully`);
      setShowForm(false);
      setEditingRegRep(null);
      await loadRegReps();
    } catch (error) {
      showError(error.message || `Failed to ${editingRegRep ? 'update' : 'create'} registration representative`);
      console.error('RegRep form submit error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (regRep) => {
    try {
      await apiService.toggleRegRepStatus(regRep.id);
      showSuccess(`Registration representative ${regRep.isActive ? 'deactivated' : 'activated'} successfully`);
      await loadRegReps();
    } catch (error) {
      showError('Failed to update registration representative status');
      console.error('Toggle status error:', error);
    }
  };

  const handleDelete = async (regRep) => {
    if (!window.confirm(`Are you sure you want to deactivate ${regRep.name}?`)) {
      return;
    }

    try {
      await apiService.deleteRegRep(regRep.id);
      showSuccess('Registration representative deactivated successfully');
      await loadRegReps();
    } catch (error) {
      showError('Failed to deactivate registration representative');
      console.error('Delete reg-rep error:', error);
    }
  };

  const handleResetPassword = (regRep) => {
    setResetPasswordRegRep(regRep);
    setShowPasswordModal(true);
  };

  const handlePasswordReset = async (newPassword) => {
    try {
      await apiService.resetRegRepPassword(resetPasswordRegRep.id, newPassword);
      showSuccess('Password reset successfully');
      setShowPasswordModal(false);
      setResetPasswordRegRep(null);
    } catch (error) {
      showError('Failed to reset password');
      console.error('Password reset error:', error);
    }
  };

  const filteredRegReps = regReps.filter(regRep =>
    regRep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    regRep.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Registration Representatives</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage registration representatives who can view system data but cannot modify it.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Reg-Rep
        </button>
      </div>

      {/* Search */}
      <div className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{regReps.length}</span>
                </div>
              </div>
              <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Reg-Reps</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">{regReps.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    {regReps.filter(r => r.isActive).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <XCircleIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4 sm:ml-5 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Inactive</dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    {regReps.filter(r => !r.isActive).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reg-Reps Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredRegReps.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <p className="text-sm sm:text-base text-gray-500">
              {searchTerm ? 'No registration representatives match your search.' : 'No registration representatives found.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredRegReps.map((regRep) => (
              <li key={regRep.id}>
                <div className="px-3 sm:px-4 py-3 sm:py-4">
                  {/* Mobile Layout: Stacked */}
                  <div className="flex flex-col sm:hidden gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            regRep.isActive ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {regRep.isActive ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {regRep.name}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                              regRep.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {regRep.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {regRep.email}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Created: {formatDate(regRep.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Mobile Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleEdit(regRep)}
                        className="text-indigo-600 hover:text-indigo-900 p-2 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(regRep)}
                        className="text-yellow-600 hover:text-yellow-900 p-2 rounded-md hover:bg-yellow-50 transition-colors"
                        title="Reset Password"
                      >
                        <KeyIcon className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(regRep)}
                        className={`p-2 rounded-md transition-colors ${
                          regRep.isActive 
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={regRep.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {regRep.isActive ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(regRep)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Layout: Horizontal */}
                  <div className="hidden sm:flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          regRep.isActive ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {regRep.isActive ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <XCircleIcon className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {regRep.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            regRep.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {regRep.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {regRep.email}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created: {formatDate(regRep.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(regRep)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(regRep)}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded-md hover:bg-yellow-50 transition-colors"
                        title="Reset Password"
                      >
                        <KeyIcon className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(regRep)}
                        className={`p-1 rounded-md transition-colors ${
                          regRep.isActive 
                            ? 'text-red-600 hover:text-red-900 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                        }`}
                        title={regRep.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {regRep.isActive ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(regRep)}
                        className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <RegRepForm
          regRep={editingRegRep}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingRegRep(null);
          }}
          isLoading={formLoading}
        />
      )}

      {showPasswordModal && resetPasswordRegRep && (
        <PasswordResetModal
          userName={resetPasswordRegRep.name}
          onSubmit={handlePasswordReset}
          onClose={() => {
            setShowPasswordModal(false);
            setResetPasswordRegRep(null);
          }}
        />
      )}
    </div>
  );
};

export default RegRepList;