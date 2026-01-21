import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// import AdminLayout from '../../components/admin/AdminLayout';
import { apiService } from '../../services/apiService';
import { apiCache } from '../../utils/cache';

const CreateSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess, fetchSessions } = useApp();
  const [loading, setLoading] = useState(false);
  
  const editingSession = location.state?.session;
  const isEditing = Boolean(editingSession);
  
  const [formData, setFormData] = useState({
    theme: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (editingSession) {
      setFormData({
        theme: editingSession.theme || '',
        startTime: editingSession.startTime ? new Date(editingSession.startTime).toISOString().slice(0, 16) : '',
        endTime: editingSession.endTime ? new Date(editingSession.endTime).toISOString().slice(0, 16) : '',
      });
    }
  }, [editingSession]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log('CreateSessionPage: Form submitted!', formData);

    try {
      if (!formData.theme.trim()) {
        showError('Session theme is required');
        setLoading(false);
        return;
      }

      if (!formData.startTime) {
        showError('Start time is required');
        setLoading(false);
        return;
      }

      if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
        showError('End time must be after start time');
        setLoading(false);
        return;
      }

      const sessionData = {
        theme: formData.theme.trim(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
      };

      console.log('CreateSessionPage: sessionData being sent:', sessionData);

      let result;
      if (isEditing) {
        console.log('CreateSessionPage: Updating session', editingSession.id);
        result = await apiService.updateSession(editingSession.id, sessionData);
        console.log('CreateSessionPage: Update result:', result);
        showSuccess('Session updated successfully');
      } else {
        console.log('CreateSessionPage: Creating new session');
        result = await apiService.createSession(sessionData);
        console.log('CreateSessionPage: Create result:', result);
        showSuccess('Session created successfully');
      }
      
      // Clear sessions cache to force refresh
      apiCache.clearPattern('/sessions');
      
      // Optimistically update sessions list immediately
      if (result?.data?.session) {
        fetchSessions(true); // Force refresh sessions list
      }
      
      navigate('/admin/sessions');
    } catch (error) {
      console.error('Session save error:', error);
      showError(error.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/sessions');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <button
          onClick={handleCancel}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 w-fit touch-manipulation"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Sessions
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Session' : 'Create New Session'}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            {isEditing ? 'Update session details and settings' : 'Set up a new church session with QR code check-in'}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-4 sm:px-6 sm:py-5 lg:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Session Theme *
              </label>
              <input
                type="text"
                name="theme"
                id="theme"
                required
                value={formData.theme}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Sunday Morning Service"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  id="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 touch-manipulation"
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  id="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 touch-manipulation"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Session' : 'Create Session')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionPage;