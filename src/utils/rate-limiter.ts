export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RateLimiter {
  private minInterval: number;
  private queue: Promise<void> = Promise.resolve();
  private lastCall: number = 0;

  constructor(callsPerSecond: number) {
    this.minInterval = 1000 / callsPerSecond;
  }

  async wait(): Promise<void> {
    this.queue = this.queue.then(async () => {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCall;
      if (timeSinceLastCall < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastCall));
      }
      this.lastCall = Date.now();
    });
    return this.queue;
  }
}
