const STORAGE_KEY = 'currentEventId';

export const getCurrentEventId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const setCurrentEventId = (eventId) => {
  try {
    if (eventId) {
      localStorage.setItem(STORAGE_KEY, eventId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode); the server falls back to Homecoming
  }
};

/** Headers for raw fetch() calls that bypass apiService. */
export const eventHeaders = () => {
  const eventId = getCurrentEventId();
  return eventId ? { 'X-Event-Id': eventId } : {};
};
