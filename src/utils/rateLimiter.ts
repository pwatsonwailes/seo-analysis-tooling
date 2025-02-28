// Adaptive rate limiter with backoff strategy
const INITIAL_BATCH_SIZE = 3; // Start with 3 concurrent requests
const MIN_BATCH_SIZE = 1; // Minimum batch size
const MAX_BATCH_SIZE = 5; // Maximum batch size
const INITIAL_RATE_LIMIT = 0.2; // Start with 1 request per 5 seconds (0.2 req/sec)
const MIN_DELAY = 5000; // Minimum delay between batches (5 seconds)
const MAX_DELAY = 30000; // Maximum delay (30 seconds)
const QUEUE: (() => Promise<void>)[] = [];
let processing = false;
let currentBatchSize = INITIAL_BATCH_SIZE;
let currentRateLimit = INITIAL_RATE_LIMIT;
let consecutiveSuccesses = 0;
let consecutiveFailures = 0;

// Track success/failure of requests
export function trackRequestOutcome(success: boolean) {
  if (success) {
    consecutiveSuccesses++;
    consecutiveFailures = 0;
    
    // Increase batch size and rate limit after consistent success
    if (consecutiveSuccesses >= 5) {
      currentBatchSize = Math.min(currentBatchSize + 1, MAX_BATCH_SIZE);
      currentRateLimit = Math.min(currentRateLimit * 1.2, 0.5); // Max 1 req per 2 seconds
      consecutiveSuccesses = 0;
    }
  } else {
    consecutiveFailures++;
    consecutiveSuccesses = 0;
    
    // Decrease batch size and rate limit after failures
    if (consecutiveFailures >= 2) {
      currentBatchSize = Math.max(currentBatchSize - 1, MIN_BATCH_SIZE);
      currentRateLimit = Math.max(currentRateLimit * 0.5, 0.05); // Min 1 req per 20 seconds
      consecutiveFailures = 0;
    }
  }
}

export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        // Track success and adjust rate limiting based on response time
        trackRequestOutcome(true);
        
        // If request took too long, slow down
        if (duration > 10000) {
          currentRateLimit = Math.max(currentRateLimit * 0.8, 0.05);
        }
        
        resolve(result);
      } catch (error) {
        // Track failure and adjust rate limiting
        trackRequestOutcome(false);
        reject(error);
      }
    };

    QUEUE.push(task);
    processQueue();
  });
}

async function processQueue() {
  if (processing || QUEUE.length === 0) return;
  
  processing = true;
  
  while (QUEUE.length > 0) {
    // Use adaptive batch size
    const batch = QUEUE.splice(0, currentBatchSize);
    
    try {
      await Promise.all(batch.map(task => task()));
      
      // Calculate adaptive delay based on current rate limit
      // Ensure delay is between MIN_DELAY and MAX_DELAY
      const delayMs = Math.min(
        Math.max(Math.ceil(batch.length / currentRateLimit) * 1000, MIN_DELAY),
        MAX_DELAY
      );
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error('Error in rate limiter batch:', error);
      // Continue processing the queue despite errors
    }
  }
  
  processing = false;
}