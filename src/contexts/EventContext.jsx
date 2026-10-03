import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from './AuthContext';
import { dataPreloader } from '../utils/preloadData';
import { getCurrentEventId, setCurrentEventId } from '../utils/currentEvent';

const EventContext = createContext(null);

const pickDefaultEvent = (events) =>
  events.find((e) => e.slug === 'homecoming') ||
  events.find((e) => e.isActive) ||
  events[0] ||
  null;

export const EventProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user, userType } = useAuth();
  const isChapelLeader = userType === 'chapel-leader';
  const sessionEventId = isChapelLeader ? user?.eventId || user?.event?.id : null;
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventIdState] = useState(getCurrentEventId());
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      const response = await apiService.getEvents();
      const list = response?.data?.events || [];
      setEvents(list);

      // A chapel leader's token belongs to exactly one event; that one is current.
      const stored = sessionEventId || getCurrentEventId();
      const selected = list.find((e) => e.id === stored) || pickDefaultEvent(list);
      if (selected && selected.id !== stored) {
        setCurrentEventId(selected.id);
      }
      setCurrentEventIdState(selected?.id || '');
      return list;
    } catch (error) {
      console.error('Failed to load events:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [sessionEventId]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      setLoading(true);
      loadEvents();
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadEvents]);

  /**
   * Switching events reloads the app so every page, cache and preloaded list
   * starts clean for the newly selected event.
   */
  const selectEvent = useCallback(async (eventId, redirectTo = '/admin/dashboard') => {
    if (!eventId) return;
    if (isChapelLeader) {
      if (eventId === currentEventId) return;
      const response = await apiService.switchEvent(eventId);
      if (!response?.token) throw new Error(response?.message || 'Could not switch event');
      localStorage.setItem('token', response.token);
      redirectTo = '/chariot/dashboard';
    }
    setCurrentEventId(eventId);
    apiService.clearCache('');
    dataPreloader.reset();
    window.location.assign(redirectTo);
  }, [currentEventId, isChapelLeader]);

  const syncEventChapels = useCallback(async (id) => {
    const response = await apiService.syncEventChapels(id);
    await loadEvents();
    return response;
  }, [loadEvents]);

  const createEvent = useCallback(async (data) => {
    const response = await apiService.createEvent(data);
    await loadEvents();
    return response;
  }, [loadEvents]);

  const updateEvent = useCallback(async (id, data) => {
    const response = await apiService.updateEvent(id, data);
    await loadEvents();
    return response?.data?.event;
  }, [loadEvents]);

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) || null,
    [events, currentEventId]
  );

  const value = {
    events,
    currentEvent,
    currentEventId,
    hasChariots: Boolean(currentEvent?.hasChariots),
    loading,
    selectEvent,
    refreshEvents: loadEvents,
    createEvent,
    updateEvent,
    syncEventChapels,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
