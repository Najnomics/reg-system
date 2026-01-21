import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { EyeIcon, EyeSlashIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
  userType: yup
    .string()
    .oneOf(['chariot-leader', 'chariot-assistant'], 'Invalid user type')
    .required('User type is required'),
});

const ChariotLoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { loginChariot, isAuthenticated, isLoading, error, clearError, userType } = useAuth();
  const { showError } = useApp();
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      userType: 'chariot-leader',
    },
  });

  const selectedUserType = watch('userType');

  useEffect(() => {
    if (error) {
      showError(error);
      clearError();
    }
  }, [error, showError, clearError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-lg"></div>
      </div>
    );
  }

  // Redirect based on user type
  if (isAuthenticated) {
    if (userType === 'chariot-leader' || userType === 'chariot-assistant') {
      return <Navigate to="/chariot/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  const onSubmit = async (data) => {
    try {
      setLoginError('');
      const result = await loginChariot(data.email, data.password, data.userType);
      if (!result.success) {
        setLoginError(result.error || 'Login failed');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-body">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Chariot Portal
              </h1>
              <p className="text-gray-600">
                Sign in as a chariot leader or assistant
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User Type Selection */}
              <div className="form-group">
                <label className="label">I am a</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="chariot-leader"
                      {...register('userType')}
                      className="radio radio-primary"
                    />
                    <span className="text-sm">Leader</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="chariot-assistant"
                      {...register('userType')}
                      className="radio radio-primary"
                    />
                    <span className="text-sm">Assistant</span>
                  </label>
                </div>
                {errors.userType && (
                  <p className="form-error">{errors.userType.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                    placeholder={`Enter ${selectedUserType === 'chariot-leader' ? 'leader' : 'assistant'} password`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {loginError && (
                <div className="alert alert-error">
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need admin access?{' '}
                <a href="/admin/login" className="text-indigo-600 hover:text-indigo-800">
                  Admin Login
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChariotLoginPage;
