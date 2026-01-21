/**
 * Request batcher to combine multiple requests into one
 * Reduces network overhead and improves performance
 */
class RequestBatcher {
  constructor(batchDelay = 50) {
    this.batchDelay = batchDelay;
    this.pendingRequests = new Map();
    this.batchTimer = null;
  }

  /**
   * Batch a request
   * @param {string} key - Unique key for the request
   * @param {Function} requestFn - Function that returns a promise
   * @returns {Promise} - The request promise
   */
  async batch(key, requestFn) {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const requestPromise = requestFn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    });

    // Store the promise
    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}

export const requestBatcher = new RequestBatcher(50);
