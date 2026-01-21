/**
 * Prefetch utility for faster navigation
 * Preloads data when user hovers over links or navigates
 */
import { apiService } from '../services/apiService';
import { apiCache } from './cache';

class Prefetcher {
  constructor() {
    this.prefetchCache = new Set();
    this.prefetchDelay = 100; // Delay before prefetching (ms)
  }

  /**
   * Prefetch data for a route
   * @param {string} route - Route path
   * @param {Function} fetchFn - Function to fetch data
   */
  prefetch(route, fetchFn) {
    // Don't prefetch if already cached or already prefetching
    if (this.prefetchCache.has(route)) {
      return;
    }

    this.prefetchCache.add(route);

    // Delay prefetch slightly to avoid blocking current navigation
    setTimeout(() => {
      try {
        fetchFn();
      } catch (error) {
        console.error(`Prefetch failed for ${route}:`, error);
        this.prefetchCache.delete(route);
      }
    }, this.prefetchDelay);
  }

  /**
   * Prefetch members data
   */
  prefetchMembers() {
    this.prefetch('/members', () => {
      apiService.getMembers({ page: 1, limit: 20 });
    });
  }

  /**
   * Prefetch sessions data
   */
  prefetchSessions() {
    this.prefetch('/sessions', () => {
      apiService.getSessions({ page: 1, limit: 20 });
    });
  }

  /**
   * Prefetch chariots data
   */
  prefetchChariots() {
    this.prefetch('/chariots', () => {
      apiService.getChariots();
    });
  }

  /**
   * Clear prefetch cache
   */
  clear() {
    this.prefetchCache.clear();
  }
}

export const prefetcher = new Prefetcher();
