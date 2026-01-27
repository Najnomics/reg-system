/**
 * Preload critical data on app initialization for faster page loads
 */
import { apiService } from '../services/apiService';
import { prefetcher } from './prefetch';

class DataPreloader {
  constructor() {
    this.preloaded = false;
    this.userType = null;
  }

  /**
   * Reset preloader state (useful when user logs out)
   */
  reset() {
    this.preloaded = false;
    this.userType = null;
  }

  /**
   * Preload critical data when app starts
   * @param {string} userType - The type of user (admin, reg-rep, pastoral, chariot-leader, chariot-assistant)
   */
  async preloadCriticalData(userType = null) {
    // Always refresh dashboard cache on page load to ensure fresh data
    apiService.refreshDashboardCache();
    
    if (this.preloaded && this.userType === userType) return;
    
    this.userType = userType;
    
    try {
      const preloadPromises = [];
      
      // Common preloads for all user types
      preloadPromises.push(
        // Preload sessions (most commonly accessed)
        apiService.getSessions({ page: 1, limit: 20 }).catch(() => {}),
      );
      
      // User-type specific preloads
      if (userType === 'admin' || userType === 'reg-rep' || userType === 'pastoral') {
        // Admin, Reg-Rep, and Pastoral team preloads
        // Note: Dashboard stats are NOT preloaded - they will be fetched fresh when dashboard loads
        preloadPromises.push(
          // Preload members (commonly accessed)
          apiService.getMembers({ page: 1, limit: 20 }).catch(() => {}),
        );
      } else if (userType === 'chariot-leader' || userType === 'chariot-assistant') {
        // Chariot leader/assistant preloads
        // Note: Dashboard stats are NOT preloaded - they will be fetched fresh when dashboard loads
        preloadPromises.push(
          // Preload chariot sessions
          apiService.getChariotSessions().catch(() => {}),
          // Preload chariot members
          apiService.getChariotOnlyMembers({ page: 1, limit: 20 }).catch(() => {}),
        );
      }
      
      // Preload in parallel for maximum speed
      await Promise.all(preloadPromises);
      
      this.preloaded = true;
    } catch (error) {
      console.error('Data preload error:', error);
      // Don't throw - preload failures shouldn't break the app
    }
  }

  /**
   * Preload data for a specific route
   */
  async preloadRoute(route) {
    switch (route) {
      case '/admin/members':
      case '/chariot/members':
        prefetcher.prefetchMembers();
        break;
      case '/admin/sessions':
      case '/chariot/sessions':
        prefetcher.prefetchSessions();
        break;
      case '/admin/chariots':
        prefetcher.prefetchChariots();
        break;
      case '/admin/chapels':
        prefetcher.prefetchChapels();
        break;
      default:
        break;
    }
  }
}

export const dataPreloader = new DataPreloader();
