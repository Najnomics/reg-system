import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';
import ThemeToggle from '../../components/common/ThemeToggle';

const inputClass =
  'block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder-gray-400 transition-colors focus:border-indigo-600 focus:outline-none focus:ring-0 sm:text-sm';

const WorkingLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated, isLoading, error, clearError, userType } = useAuth();
  const { showError } = useApp();

  useEffect(() => {
    if (error) {
      showError(error);
      clearError();
    }
  }, [error, showError, clearError]);

  if (isAuthenticated) {
    if (['chariot-leader', 'chariot-assistant', 'chapel-leader'].includes(userType)) {
      return <Navigate to="/chariot/dashboard" replace />;
    }
    return <Navigate to="/events" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-indigo-600" />
          <span className="text-[13px] font-semibold tracking-tight text-ink">Attendance</span>
          <ThemeToggle className="ml-auto" />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="rise text-[30px] font-medium tracking-tight text-ink">Sign in</h1>
            <p className="rise mt-1.5 text-sm text-gray-500" style={{ '--i': 1 }}>
              For administrators, registration reps, chariot leaders and chapel leaders.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div className="rise" style={{ '--i': 2 }}>
                <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-600">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  placeholder="you@church.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="rise" style={{ '--i': 3 }}>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-gray-600">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`${inputClass} pr-11`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400 transition-colors hover:text-ink"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rise pt-2" style={{ '--i': 4 }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>

            <p className="fade mt-8 text-xs leading-relaxed text-gray-500" style={{ '--i': 6 }}>
              Chapel leaders sign in with their email and the shared chapel leader password. Ask your administrator if
              you need access.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">Church Attendance System</p>
      </div>

      <div className="relative hidden overflow-hidden bg-sanctuary-bg lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(201,163,94,0.14),transparent_60%)]" />
        <div className="relative flex h-full flex-col items-center justify-center px-12">
          <div className="fade relative h-[360px] w-[240px]" style={{ '--i': 2 }}>
            <div className="absolute inset-0 rounded-t-full border border-brass-500/50" />
            <div className="absolute inset-[14px] rounded-t-full border border-brass-500/20" />
            <div className="absolute inset-x-[14px] bottom-[14px] top-[14px] overflow-hidden rounded-t-full">
              <div className="absolute inset-0 animate-[arch-glow_6s_ease-in-out_infinite] bg-[linear-gradient(180deg,rgba(201,163,94,0.22),rgba(201,163,94,0.02)_75%)]" />
            </div>
          </div>
          <blockquote className="fade mt-12 max-w-sm text-center" style={{ '--i': 5 }}>
            <p className="font-serif text-[22px] font-light italic leading-snug text-sanctuary-text">
              “Not forsaking the assembling of ourselves together.”
            </p>
            <footer className="mt-3 text-[11px] uppercase tracking-[0.16em] text-brass-500">Hebrews 10:25</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default WorkingLoginPage;
