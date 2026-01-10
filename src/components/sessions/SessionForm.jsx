import { useState } from 'react';
import { useApp } from '../../contexts/SimpleAppContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

const SessionForm = ({ session, onClose, onSuccess }) => {
  const { showError, showSuccess } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    theme: session?.theme || '',
    startTime: session?.startTime ? new Date(session.startTime).toISOString().slice(0, 16) : '',
    endTime: session?.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : '',
    location: session?.location || '',
    description: session?.description || '',
    sessionPassword: session?.sessionPassword || '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
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

      // Validate end time is after start time
      if (formData.endTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
        showError('End time must be after start time');
        setLoading(false);
        return;
      }

      if (!formData.sessionPassword.trim() || formData.sessionPassword.length !== 3) {
        showError('Session password must be exactly 3 digits');
        setLoading(false);
        return;
      }

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));

      showSuccess(session ? 'Session updated successfully' : 'Session created successfully');
      onSuccess();
    } catch (error) {
      showError('Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {session ? 'Edit Session' : 'Create New Session'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

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
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              type="text"
              name="location"
              id="location"
              value={formData.location}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Main Sanctuary"
            />
          </div>

          <div>
            <label htmlFor="sessionPassword" className="block text-sm font-medium text-gray-700">
              Session Password *
            </label>
            <input
              type="text"
              name="sessionPassword"
              id="sessionPassword"
              required
              maxLength="3"
              pattern="[0-9]{3}"
              value={formData.sessionPassword}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 123"
            />
            <p className="mt-1 text-sm text-gray-500">
              3-digit password that members need to access check-in
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Optional description of the session"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : session ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionForm;