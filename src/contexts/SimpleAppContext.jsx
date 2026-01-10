import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const setSidebar = (open) => {
    setSidebarOpen(open);
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

  // Mock data functions (replace with actual API calls later)
  const fetchMembers = async () => {
    setLoading(true);
    // Mock delay
    setTimeout(() => {
      setMembers([
        { 
          id: 1, 
          firstName: 'John', 
          lastName: 'Doe', 
          email: 'john.doe@church.com',
          phone: '(555) 123-4567',
          memberCode: '1234',
          dateOfBirth: '1985-06-15',
          createdAt: '2024-01-15T10:30:00Z',
          isActive: true
        },
        { 
          id: 2, 
          firstName: 'Jane', 
          lastName: 'Smith', 
          email: 'jane.smith@church.com',
          phone: '(555) 234-5678',
          memberCode: '2345',
          dateOfBirth: '1992-03-22',
          createdAt: '2024-01-16T14:20:00Z',
          isActive: true
        },
        { 
          id: 3, 
          firstName: 'Robert', 
          lastName: 'Johnson', 
          email: 'robert.johnson@church.com',
          phone: '(555) 345-6789',
          memberCode: '3456',
          dateOfBirth: '1978-11-08',
          createdAt: '2024-01-17T09:15:00Z',
          isActive: true
        },
        { 
          id: 4, 
          firstName: 'Mary', 
          lastName: 'Williams', 
          email: 'mary.williams@church.com',
          phone: '(555) 456-7890',
          memberCode: '4567',
          dateOfBirth: '1989-09-12',
          createdAt: '2024-01-18T11:45:00Z',
          isActive: true
        },
        { 
          id: 5, 
          firstName: 'David', 
          lastName: 'Brown', 
          email: 'david.brown@church.com',
          phone: '(555) 567-8901',
          memberCode: '5678',
          dateOfBirth: '1995-04-30',
          createdAt: '2024-01-19T16:30:00Z',
          isActive: false
        },
        { 
          id: 6, 
          firstName: 'Sarah', 
          lastName: 'Davis', 
          email: 'sarah.davis@church.com',
          phone: '(555) 678-9012',
          memberCode: '6789',
          dateOfBirth: '1987-12-03',
          createdAt: '2024-01-20T08:20:00Z',
          isActive: true
        },
        { 
          id: 7, 
          firstName: 'Michael', 
          lastName: 'Wilson', 
          email: 'michael.wilson@church.com',
          phone: '(555) 789-0123',
          memberCode: '7890',
          dateOfBirth: '1983-07-18',
          createdAt: '2024-01-21T13:10:00Z',
          isActive: true
        },
        { 
          id: 8, 
          firstName: 'Lisa', 
          lastName: 'Miller', 
          email: 'lisa.miller@church.com',
          phone: '(555) 890-1234',
          memberCode: '8901',
          dateOfBirth: '1991-02-25',
          createdAt: '2024-01-22T15:50:00Z',
          isActive: true
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const fetchSessions = async () => {
    setLoading(true);
    setTimeout(() => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      setSessions([
        { 
          id: 1, 
          theme: 'Sunday Morning Service', 
          startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10 AM today
          endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12 PM today
          location: 'Main Sanctuary',
          description: 'Weekly Sunday morning worship service',
          sessionPassword: '123',
          checkedInCount: 87
        },
        { 
          id: 2, 
          theme: 'Youth Bible Study', 
          startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString(), // 7 PM tomorrow
          endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 20.5 * 60 * 60 * 1000).toISOString(), // 8:30 PM tomorrow
          location: 'Youth Room',
          description: 'Weekly Bible study for teenagers',
          sessionPassword: '456',
          checkedInCount: 0
        },
        { 
          id: 3, 
          theme: 'Wednesday Evening Prayer', 
          startTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 19.5 * 60 * 60 * 1000).toISOString(), // 7:30 PM Wednesday
          endTime: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000).toISOString(), // 9 PM Wednesday
          location: 'Prayer Chapel',
          description: 'Mid-week prayer and fellowship',
          sessionPassword: '789',
          checkedInCount: 0
        },
        { 
          id: 4, 
          theme: 'Christmas Eve Service', 
          startTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000).toISOString(), // 7 PM two days ago
          endTime: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000 + 20.5 * 60 * 60 * 1000).toISOString(), // 8:30 PM two days ago
          location: 'Main Sanctuary',
          description: 'Special Christmas Eve worship service',
          sessionPassword: '321',
          checkedInCount: 156
        },
        { 
          id: 5, 
          theme: 'Saturday Morning Men\'s Fellowship', 
          startTime: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), // 8 AM next Saturday
          endTime: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(), // 10 AM next Saturday
          location: 'Fellowship Hall',
          description: 'Monthly men\'s fellowship breakfast and study',
          sessionPassword: '654',
          checkedInCount: 0
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const fetchReportData = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
    return [];
  };

  const value = {
    sidebarOpen,
    setSidebar,
    notifications,
    showNotification,
    showError,
    showSuccess,
    removeNotification,
    members,
    sessions,
    loading,
    fetchMembers,
    fetchSessions,
    fetchReportData,
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