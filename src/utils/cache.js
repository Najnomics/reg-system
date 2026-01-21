/**
 * Simple in-memory cache for API responses with stale-while-revalidate support
 */
class ApiCache {
  constructor(maxAge = 10 * 60 * 1000, staleAge = 30 * 60 * 1000) { // 10 min fresh, 30 min stale
    this.cache = new Map();
    this.maxAge = maxAge;
    this.staleAge = staleAge;
    this.pendingRequests = new Map(); // Track ongoing requests to prevent duplicate calls
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const age = Date.now() - item.timestamp;
    
    // Return stale data if within stale age (stale-while-revalidate)
    if (age > this.maxAge && age <= this.staleAge) {
      return { ...item.data, _stale: true };
    }
    
    // Delete if too old
    if (age > this.staleAge) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  // Check if a request is already pending for this key
  isPending(key) {
    return this.pendingRequests.has(key);
  }
  
  // Mark request as pending
  setPending(key, promise) {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }
  
  // Get pending promise if exists
  getPending(key) {
    return this.pendingRequests.get(key);
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }

  // Clear cache entries matching a pattern
  clearPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new ApiCache(10 * 60 * 1000, 30 * 60 * 1000); // 10 min fresh, 30 min stale
