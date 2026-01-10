import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { checkinService } from '../../services/checkinService';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const schema = yup.object().shape({
  securityAnswer: yup.string().required('Security answer is required'),
  pin: yup.string().required('PIN is required').length(5, 'PIN must be exactly 5 digits').matches(/^\d+$/, 'PIN must contain only numbers'),
});

const CheckinForm = ({ session, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Security Question, 2: PIN Entry

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setFocus,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      securityAnswer: '',
      pin: '',
    }
  });

  const handleSecurityAnswer = () => {
    const answer = getValues('securityAnswer');
    if (answer.trim()) {
      setStep(2);
      setTimeout(() => setFocus('pin'), 100);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await checkinService.submitCheckin(session.id, {
        securityAnswer: data.securityAnswer.trim(),
        pin: data.pin,
      });
      
      onSuccess(response);
    } catch (err) {
      setError(err.message);
      
      // If PIN is wrong, stay on PIN step
      if (err.message.includes('PIN') || err.message.includes('Member not found')) {
        setStep(2);
        setFocus('pin');
      } else {
        // If security answer is wrong, go back to step 1
        setStep(1);
        setFocus('securityAnswer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
    setTimeout(() => setFocus('securityAnswer'), 100);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Progress indicator */}
      <div className="bg-indigo-50 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {step > 1 ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Security Question</span>
          </div>
          
          <div className={`w-8 h-0.5 ${step > 1 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Enter PIN</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Security Question */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="securityAnswer" className="block text-lg font-medium text-gray-900 mb-2">
                Security Question
              </label>
              <p className="text-gray-700 mb-4 p-4 bg-gray-50 rounded-md border">
                {session.securityQuestion}
              </p>
              <input
                type="text"
                id="securityAnswer"
                placeholder="Enter your answer"
                {...register('securityAnswer')}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
              {errors.securityAnswer && (
                <p className="mt-1 text-sm text-red-600">{errors.securityAnswer.message}</p>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleSecurityAnswer}
              disabled={!getValues('securityAnswer')?.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: PIN Entry */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-lg font-medium text-gray-900 mb-2">
                Enter Your 5-Digit PIN
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 5-digit PIN that was sent to your email when you were registered.
              </p>
              <input
                type="text"
                id="pin"
                placeholder="12345"
                maxLength={5}
                {...register('pin')}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-xl text-center font-mono tracking-widest focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
              {errors.pin && (
                <p className="mt-1 text-sm text-red-600">{errors.pin.message}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={submitting || !getValues('pin')}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    Checking In...
                  </>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble? Please ask an administrator for assistance.
          </p>
        </div>
      </form>
    </div>
  );
};

export default CheckinForm;