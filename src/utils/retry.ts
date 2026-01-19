/**
 * Retry utility with exponential backoff.
 * Only retries on transient errors (5xx, network errors).
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [500, 502, 503, 504, 408, 429],
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt > opts.maxRetries) {
        break;
      }

      if (!isRetryable(error, opts.retryableStatuses)) {
        throw error; // Don't retry non-retryable errors
      }

      // Notify about retry
      opts.onRetry?.(lastError, attempt);

      // Wait before retry
      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw new RetryError(
    `Failed after ${opts.maxRetries + 1} attempts: ${lastError?.message}`,
    opts.maxRetries + 1,
    lastError!
  );
}

function isRetryable(error: unknown, retryableStatuses: number[]): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check HTTP status if available
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return retryableStatuses.includes(status);
  }

  // Check error message for common retryable patterns
  const message = String(error);
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('socket hang up')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convenience wrapper for API responses
export async function withApiRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return withRetry(fn, {
    ...options,
    onRetry: (error, attempt) => {
      console.log(`[API Retry] Attempt ${attempt} failed: ${error.message}. Retrying...`);
      options?.onRetry?.(error, attempt);
    },
  });
}
