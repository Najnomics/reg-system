/**
 * Preload critical data on app initialization for faster page loads
 */
import { apiService } from '../services/apiService';
import { prefetcher } from './prefetch';

class DataPreloader {
  constructor() {
    this.preloaded = false;
  }

  /**
   * Preload critical data when app starts
   */
  async preloadCriticalData() {
    if (this.preloaded) return;
    
    try {
      // Preload in parallel for maximum speed
      await Promise.all([
        // Preload sessions (most commonly accessed)
        apiService.getSessions({ page: 1, limit: 20 }).catch(() => {}),
        // Preload members (commonly accessed)
        apiService.getMembers({ page: 1, limit: 20 }).catch(() => {}),
      ]);
      
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
