import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { sessionService } from '../../services/sessionService';
import { format, addHours } from 'date-fns';

const schema = yup.object().shape({
  theme: yup.string().required('Session theme is required').min(3, 'Theme must be at least 3 characters'),
  description: yup.string(),
  startTime: yup.string().required('Start time is required'),
  endTime: yup.string().required('End time is required'),
  securityQuestion: yup.string().required('Security question is required'),
  securityAnswer: yup.string().required('Security answer is required'),
  maxAttendees: yup.number().positive('Max attendees must be positive').nullable(),
  location: yup.string(),
  notes: yup.string(),
}).test('endTimeAfterStart', 'End time must be after start time', function(values) {
  if (values.startTime && values.endTime) {
    return new Date(values.endTime) > new Date(values.startTime);
  }
  return true;
});

const SessionForm = ({ session, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      theme: '',
      description: '',
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
      securityQuestion: '',
      securityAnswer: '',
      maxAttendees: '',
      location: '',
      notes: '',
    }
  });

  const startTime = watch('startTime');

  useEffect(() => {
    if (session) {
      reset({
        theme: session.theme || '',
        description: session.description || '',
        startTime: session.startTime ? format(new Date(session.startTime), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: session.endTime ? format(new Date(session.endTime), "yyyy-MM-dd'T'HH:mm") : '',
        securityQuestion: session.securityQuestion || '',
        securityAnswer: session.securityAnswer || '',
        maxAttendees: session.maxAttendees || '',
        location: session.location || '',
        notes: session.notes || '',
      });
    }
  }, [session, reset]);

  // Auto-update end time when start time changes (if not editing)
  useEffect(() => {
    if (!session && startTime) {
      const start = new Date(startTime);
      const end = addHours(start, 2);
      setValue('endTime', format(end, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [startTime, session, setValue]);

  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);

    try {
      const sessionData = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees) : null,
      };

      if (session) {
        await sessionService.updateSession(session.id, sessionData);
      } else {
        await sessionService.createSession(sessionData);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const securityQuestions = [
    "What is the name of this venue/church?",
    "What color is the main entrance door?",
    "How many steps are at the main entrance?",
    "What is displayed on the front wall/altar?",
    "What is the pastor's first name?",
  ];

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {session ? 'Edit Session' : 'Create New Session'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                Session Theme *
              </label>
              <input
                type="text"
                id="theme"
                placeholder="e.g., Sunday Morning Service, Prayer Meeting, Youth Conference"
                {...register('theme')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.theme && (
                <p className="mt-1 text-sm text-red-600">{errors.theme.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief description of the session"
                {...register('description')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Start Time *
              </label>
              <input
                type="datetime-local"
                id="startTime"
                {...register('startTime')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                End Time *
              </label>
              <input
                type="datetime-local"
                id="endTime"
                {...register('endTime')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Security Question */}
          <div className="space-y-4">
            <div>
              <label htmlFor="securityQuestion" className="block text-sm font-medium text-gray-700">
                Security Question *
              </label>
              <select
                id="securityQuestion"
                {...register('securityQuestion')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select a question...</option>
                {securityQuestions.map((question, index) => (
                  <option key={index} value={question}>
                    {question}
                  </option>
                ))}
              </select>
              {errors.securityQuestion && (
                <p className="mt-1 text-sm text-red-600">{errors.securityQuestion.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                This question helps verify that attendees are physically present at the venue.
              </p>
            </div>

            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                Correct Answer *
              </label>
              <input
                type="text"
                id="securityAnswer"
                placeholder="Enter the correct answer"
                {...register('securityAnswer')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.securityAnswer && (
                <p className="mt-1 text-sm text-red-600">{errors.securityAnswer.message}</p>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700">
                Max Attendees
              </label>
              <input
                type="number"
                id="maxAttendees"
                min="1"
                placeholder="Leave empty for unlimited"
                {...register('maxAttendees')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.maxAttendees && (
                <p className="mt-1 text-sm text-red-600">{errors.maxAttendees.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                id="location"
                placeholder="e.g., Main Sanctuary, Conference Hall"
                {...register('location')}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes (Internal)
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Internal notes for admins"
              {...register('notes')}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </form>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (session ? 'Update Session' : 'Create Session')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionForm;