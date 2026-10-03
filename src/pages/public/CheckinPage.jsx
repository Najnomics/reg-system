import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BackspaceIcon } from '@heroicons/react/24/outline';
import apiService from '../../services/apiService';

const CODE_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const Arch = ({ lit, dim, children }) => (
  <div className={`relative mx-auto h-[250px] w-[210px] transition-opacity duration-700 sm:h-[280px] sm:w-[230px] ${dim ? 'opacity-50' : ''}`}>
    <div className="absolute inset-0 rounded-t-full border border-brass-500/60" />
    <div className="absolute inset-[10px] overflow-hidden rounded-t-full border border-brass-500/15">
      <div className={`checkin-light absolute inset-0 origin-bottom bg-[linear-gradient(180deg,#E3C88F,#C9A35E_55%,#A88546)] ${lit ? 'is-lit' : ''}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(201,163,94,0.16),transparent_70%)]" />
    </div>
    <div
      className={`relative flex h-full flex-col items-center justify-end px-6 pb-8 text-center transition-colors duration-700 ${
        lit ? 'text-sanctuary-bg' : 'text-sanctuary-text'
      }`}
    >
      {children}
    </div>
  </div>
);

const CheckInPage = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState('');
  const codeRef = useRef('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [member, setMember] = useState(null);

  const sessionFetchedRef = useRef(false);
  const sessionFetchInProgressRef = useRef(false);

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      if (sessionFetchedRef.current || sessionFetchInProgressRef.current) return;
      sessionFetchInProgressRef.current = true;

      try {
        setLoading(true);
        const response = await apiService.getSessionInfo(sessionId);
        const sessionData = response?.data?.session || response?.session || response;
        if (sessionData) {
          setSession(sessionData);
          sessionFetchedRef.current = true;
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Failed to fetch session info:', err);
        setSession(null);
      } finally {
        setLoading(false);
        sessionFetchInProgressRef.current = false;
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const submit = useCallback(
    async (memberCode) => {
      setChecking(true);
      setError('');
      try {
        const response = await apiService.checkInWithPin(sessionId, memberCode);
        if (response.success) {
          const data = response.data?.member;
          setMember({
            firstName: data?.name?.split(' ')[0] || 'friend',
            pin: data?.pin || memberCode,
            email: data?.email || '',
            checkedInAt: new Date(),
          });
        } else {
          setError(response.message || 'That code didn’t match. Please check your 4-digit code.');
          setShakeKey((k) => k + 1);
          codeRef.current = '';
          setCode('');
        }
      } catch (err) {
        console.error('Check-in error:', err);
        setError(err.response?.data?.message || err.message || 'Could not check you in. Please try again.');
        setShakeKey((k) => k + 1);
        codeRef.current = '';
        setCode('');
      } finally {
        setChecking(false);
      }
    },
    [sessionId]
  );

  const updateCode = useCallback((value) => {
    codeRef.current = value;
    setCode(value);
  }, []);

  const press = useCallback(
    (key) => {
      if (checking || member) return;
      // Read from the ref: rapid presses can land before React re-binds this handler.
      const current = codeRef.current;
      setError('');
      if (key === 'back') {
        updateCode(current.slice(0, -1));
        return;
      }
      if (current.length >= CODE_LENGTH) return;
      const next = current + key;
      updateCode(next);
      if (next.length === CODE_LENGTH) submit(next);
    },
    [checking, member, submit, updateCode]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const shell = (content) => (
    <div className="min-h-[100dvh] bg-sanctuary-bg text-sanctuary-text">
      <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="fade flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-sanctuary-muted">
          <span>Check in</span>
          {session?.startTime && <span>{formatTime(new Date())}</span>}
        </div>
        {content}
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse">
          <Arch dim>
            <div className="h-3 w-24 rounded bg-sanctuary-line" />
            <div className="mt-3 h-5 w-32 rounded bg-sanctuary-line" />
          </Arch>
        </div>
      </div>
    );
  }

  if (!session) {
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Arch dim>
          <span className="text-[11px] uppercase tracking-[0.16em] text-brass-500">Not found</span>
        </Arch>
        <h1 className="rise mt-10 font-serif text-[28px] font-light">This session isn’t available</h1>
        <p className="rise mt-2 text-sm text-sanctuary-muted" style={{ '--i': 1 }}>
          The QR code may be for a session that has ended or been removed. Please ask a volunteer for help.
        </p>
      </div>
    );
  }

  const lit = Boolean(member);

  return shell(
    <>
      <div className="mt-8 sm:mt-10">
        <div className="fade" style={{ '--i': 1 }}>
          <Arch lit={lit}>
            <span className={`text-[10px] uppercase tracking-[0.18em] ${lit ? 'text-sanctuary-bg/70' : 'text-brass-500'}`}>
              {formatDay(session.startTime)}
            </span>
            <h1 className="mt-2 font-serif text-[24px] font-light leading-tight">{session.theme?.replace(/_/g, ' · ')}</h1>
            <p className={`mt-2 text-xs ${lit ? 'text-sanctuary-bg/75' : 'text-sanctuary-muted'}`}>
              {lit
                ? `Welcome, ${member.firstName} — you are present`
                : session.endTime
                  ? `${formatTime(session.startTime)} – ${formatTime(session.endTime)}`
                  : formatTime(session.startTime)}
            </p>
          </Arch>
        </div>
      </div>

      {lit ? (
        <div className="mt-10 flex flex-1 flex-col">
          <div className="rise text-center" style={{ '--i': 6 }}>
            <p className="text-sm text-sanctuary-text">You’re checked in.</p>
            <p className="mt-1 text-xs text-sanctuary-muted">
              {formatTime(member.checkedInAt)}
              {session.location ? ` · ${session.location}` : ''}
            </p>
          </div>

          <div className="rise mt-8 divide-y divide-sanctuary-line rounded-2xl border border-sanctuary-line bg-sanctuary-s1" style={{ '--i': 8 }}>
            <div className="flex items-center justify-between px-5 py-3.5 text-sm">
              <span className="text-sanctuary-muted">Your 4-digit code</span>
              <span className="font-mono text-lg tracking-[0.3em] text-brass-400">{member.pin}</span>
            </div>
            {member.email && (
              <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <span className="text-sanctuary-muted">Email</span>
                <span className="truncate text-sanctuary-text">{member.email}</span>
              </div>
            )}
          </div>

          <p className="fade mt-auto pt-8 text-center text-xs text-sanctuary-muted" style={{ '--i': 10 }}>
            Keep your code for the next session.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col">
          <div key={shakeKey} className={`flex justify-center gap-4 ${shakeKey ? 'animate-[shake_.45s_ease]' : ''}`}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full border transition-all duration-200 ${
                  i < code.length ? 'scale-110 border-brass-500 bg-brass-500' : 'border-brass-500/50'
                } ${error ? 'border-red-400/70' : ''}`}
              />
            ))}
          </div>
          <p className={`mt-4 min-h-[2.5rem] text-center text-xs leading-relaxed ${error ? 'text-red-300' : 'text-sanctuary-muted'}`} aria-live="polite">
            {checking ? 'Checking you in…' : error || 'Enter the 4-digit code from your email'}
          </p>

          <div className="mt-auto grid grid-cols-3 gap-x-4 gap-y-2 pb-2">
            {KEYS.map((key, i) =>
              key === '' ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => press(key)}
                  disabled={checking}
                  aria-label={key === 'back' ? 'Delete' : key}
                  className="flex h-16 items-center justify-center rounded-2xl font-serif text-[28px] font-light text-sanctuary-text transition-colors duration-150 active:bg-sanctuary-s2 disabled:opacity-40 sm:hover:bg-sanctuary-s1"
                >
                  {key === 'back' ? <BackspaceIcon className="h-6 w-6 text-sanctuary-muted" /> : key}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CheckInPage;
