const BATCH_SIZE = 3; // Reduced from 5 to 3 concurrent requests
const RATE_LIMIT = 0.2; // Reduced to 1 request per 5 seconds (0.2 req/sec)
const QUEUE: (() => Promise<void>)[] = [];
let processing = false;

export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
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
    const batch = QUEUE.splice(0, BATCH_SIZE);
    await Promise.all(batch.map(task => task()));
    // Calculate delay based on batch size and rate limit
    // Minimum 5 seconds between batches
    const delayMs = Math.max(10000, Math.ceil(batch.length / RATE_LIMIT) * 1000);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  processing = false;
}
