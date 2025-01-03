const RATE_LIMIT = 2; // requests per second
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
    const batch = QUEUE.splice(0, RATE_LIMIT);
    await Promise.all(batch.map(task => task()));
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between batches
  }
  
  processing = false;
}