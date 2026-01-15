import { createContext, useContext, useState } from 'react';
import { apiService } from '../services/apiService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cache and request tracking to prevent duplicate calls
  const [membersCache, setMembersCache] = useState({ data: null, timestamp: null });
  const [sessionsCache, setSessionsCache] = useState({ data: null, timestamp: null });
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [fetchingSessions, setFetchingSessions] = useState(false);
  
  const CACHE_DURATION = 30000; // 30 seconds cache

  const setSidebar = (open) => {
    setSidebarOpen(open);
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const showError = (message) => {
    showNotification(message, 'error');
  };

  const showSuccess = (message) => {
    showNotification(message, 'success');
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Real API functions with caching and deduplication
  const fetchMembers = async (forceRefresh = false) => {
    // Prevent duplicate concurrent requests
    if (fetchingMembers && !forceRefresh) {
      console.log('Members fetch already in progress, skipping...');
      return;
    }
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && membersCache.data && membersCache.timestamp && (now - membersCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached members data');
      setMembers(membersCache.data);
      return;
    }
    
    try {
      setFetchingMembers(true);
      setLoading(true);
      const response = await apiService.getMembers();
      console.log('fetchMembers response:', response);
      // Extract members array from API response
      const membersData = response?.data?.members || response?.members || [];
      // Filter out inactive members so they don't appear in the UI
      const activeMembers = Array.isArray(membersData) ? membersData.filter(member => member.isActive !== false) : [];
      setMembers(activeMembers);
      // Update cache
      setMembersCache({ data: activeMembers, timestamp: now });
    } catch (error) {
      console.error('Failed to fetch members:', error);
      showError('Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
      setFetchingMembers(false);
    }
  };

  const fetchSessions = async (forceRefresh = false) => {
    // Prevent duplicate concurrent requests
    if (fetchingSessions && !forceRefresh) {
      console.log('Sessions fetch already in progress, skipping...');
      return;
    }
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && sessionsCache.data && sessionsCache.timestamp && (now - sessionsCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached sessions data');
      setSessions(sessionsCache.data);
      return;
    }
    
    try {
      setFetchingSessions(true);
      setLoading(true);
      const response = await apiService.getSessions();
      console.log('fetchSessions response:', response);
      // Extract sessions array from API response
      const sessionsData = response?.data?.sessions || response?.sessions || [];
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : [];
      console.log('Sessions array:', sessionsArray);
      console.log('First session with secret fields:', sessionsArray[0] ? {
        id: sessionsArray[0].id,
        theme: sessionsArray[0].theme,
        secretQuestion: sessionsArray[0].secretQuestion,
        secretAnswerPlain: sessionsArray[0].secretAnswerPlain
      } : 'No sessions');
      setSessions(sessionsArray);
      // Update cache
      setSessionsCache({ data: sessionsArray, timestamp: now });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      showError('Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
      setFetchingSessions(false);
    }
  };

  const fetchReportData = async (filters = {}) => {
    try {
      setLoading(true);
      const data = await apiService.getAttendanceReport(filters);
      return data;
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      showError('Failed to load report data');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add member functions
  const createMember = async (memberData) => {
    try {
      console.log('Context: createMember called with:', memberData);
      const response = await apiService.createMember(memberData);
      console.log('Context: createMember API response:', response);
      const newMember = response?.data?.member || response?.member || response;
      console.log('Context: Extracted member data:', newMember);
      setMembers(prev => {
        console.log('Context: Updating members state, current count:', prev.length);
        const updated = [...prev, newMember];
        // Update cache
        setMembersCache({ data: updated, timestamp: Date.now() });
        return updated;
      });
      showSuccess('Member created successfully');
      return newMember;
    } catch (error) {
      console.error('Failed to create member:', error);
      showError('Failed to create member');
      throw error;
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      const response = await apiService.updateMember(id, memberData);
      const updatedMember = response?.data?.member || response?.member || response;
      setMembers(prev => {
        const updated = prev.map(m => m.id === id ? updatedMember : m);
        // Update cache
        setMembersCache({ data: updated, timestamp: Date.now() });
        return updated;
      });
      showSuccess('Member updated successfully');
      return updatedMember;
    } catch (error) {
      console.error('Failed to update member:', error);
      showError('Failed to update member');
      throw error;
    }
  };

  const deleteMember = async (id) => {
    try {
      await apiService.deleteMember(id);
      setMembers(prev => {
        const updated = prev.filter(m => m.id !== id);
        // Update cache
        setMembersCache({ data: updated, timestamp: Date.now() });
        return updated;
      });
      showSuccess('Member deleted successfully');
    } catch (error) {
      console.error('Failed to delete member:', error);
      showError('Failed to delete member');
      throw error;
    }
  };

  // Add session functions
  const createSession = async (sessionData) => {
    try {
      const newSession = await apiService.createSession(sessionData);
      const sessionData_extracted = newSession?.data?.session || newSession?.session || newSession;
      setSessions(prev => {
        const updated = [...prev, sessionData_extracted];
        // Update cache
        setSessionsCache({ data: updated, timestamp: Date.now() });
        return updated;
      });
      showSuccess('Session created successfully');
      return sessionData_extracted;
    } catch (error) {
      console.error('Failed to create session:', error);
      showError('Failed to create session');
      throw error;
    }
  };

  const updateSession = async (id, sessionData) => {
    try {
      const updatedSession = await apiService.updateSession(id, sessionData);
      setSessions(prev => prev.map(s => s.id === id ? updatedSession : s));
      showSuccess('Session updated successfully');
      return updatedSession;
    } catch (error) {
      console.error('Failed to update session:', error);
      showError('Failed to update session');
      throw error;
    }
  };

  const deleteSession = async (id) => {
    try {
      await apiService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      showSuccess('Session deleted successfully');
    } catch (error) {
      console.error('Failed to delete session:', error);
      showError('Failed to delete session');
      throw error;
    }
  };

  // Check-in functions
  const checkInWithCode = async (sessionId, memberCode) => {
    try {
      const result = await apiService.checkInWithPin(sessionId, memberCode);
      showSuccess('Successfully checked in!');
      return result;
    } catch (error) {
      console.error('Failed to check in:', error);
      showError('Failed to check in');
      throw error;
    }
  };

  const checkInGuest = async (sessionId, guestData) => {
    try {
      const result = await apiService.checkInManual(sessionId, guestData);
      showSuccess('Guest successfully checked in!');
      return result;
    } catch (error) {
      console.error('Failed to check in guest:', error);
      showError('Failed to check in guest');
      throw error;
    }
  };

  const value = {
    sidebarOpen,
    setSidebar,
    toggleSidebar,
    notifications,
    showNotification,
    showError,
    showSuccess,
    removeNotification,
    clearNotifications,
    members,
    setMembers,
    sessions,
    loading,
    fetchMembers,
    fetchSessions,
    fetchReportData,
    createMember,
    updateMember,
    deleteMember,
    createSession,
    updateSession,
    deleteSession,
    checkInWithCode,
    checkInGuest,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};