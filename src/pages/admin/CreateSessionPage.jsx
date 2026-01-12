import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
// import AdminLayout from '../../components/admin/AdminLayout';
import { apiService } from '../../services/apiService';

const CreateSessionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useApp();
  const [loading, setLoading] = useState(false);
  
  const editingSession = location.state?.session;
  const isEditing = Boolean(editingSession);
  
  const [formData, setFormData] = useState({
    theme: '',
    startTime: '',
    endTime: '',
    secretQuestion: '',
    secretAnswer: '',
  });

  useEffect(() => {
    if (editingSession) {
      setFormData({
        theme: editingSession.theme || '',
        startTime: editingSession.startTime ? new Date(editingSession.startTime).toISOString().slice(0, 16) : '',
        endTime: editingSession.endTime ? new Date(editingSession.endTime).toISOString().slice(0, 16) : '',
        secretQuestion: editingSession.secretQuestion || '',
        secretAnswer: '', // Don't populate for security
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

      if (!formData.secretQuestion.trim()) {
        showError('Security question is required');
        setLoading(false);
        return;
      }

      if (!formData.secretAnswer.trim()) {
        showError('Security answer is required');
        setLoading(false);
        return;
      }

      const sessionData = {
        theme: formData.theme.trim(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        secretQuestion: formData.secretQuestion.trim(),
        secretAnswer: formData.secretAnswer.trim()
      };

      console.log('CreateSessionPage: sessionData being sent:', sessionData);

      if (isEditing) {
        console.log('CreateSessionPage: Updating session', editingSession.id);
        const result = await apiService.updateSession(editingSession.id, sessionData);
        console.log('CreateSessionPage: Update result:', result);
        showSuccess('Session updated successfully');
      } else {
        console.log('CreateSessionPage: Creating new session');
        const result = await apiService.createSession(sessionData);
        console.log('CreateSessionPage: Create result:', result);
        showSuccess('Session created successfully');
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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                onClick={handleCancel}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Sessions
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Session' : 'Create New Session'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditing ? 'Update session details and settings' : 'Set up a new church session with QR code check-in'}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                  Session Theme *
                </label>
                <input
                  type="text"
                  name="theme"
                  id="theme"
                  required
                  value={formData.theme}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Sunday Morning Service"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    id="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    id="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secretQuestion" className="block text-sm font-medium text-gray-700">
                  Security Question *
                </label>
                <input
                  type="text"
                  name="secretQuestion"
                  id="secretQuestion"
                  required
                  value={formData.secretQuestion}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., What is today's date?"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Question that members need to answer to check in
                </p>
              </div>

              <div>
                <label htmlFor="secretAnswer" className="block text-sm font-medium text-gray-700">
                  Security Answer *
                </label>
                <input
                  type="text"
                  name="secretAnswer"
                  id="secretAnswer"
                  required
                  value={formData.secretAnswer}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Answer to the security question"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Answer that members need to provide to check in
                </p>
              </div>


              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Session' : 'Create Session')}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionPage;