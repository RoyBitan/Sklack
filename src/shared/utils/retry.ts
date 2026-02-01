/**
 * Utility for retrying asynchronous operations with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's a validation error or unauthorized
      if (
        error?.status === 400 || error?.status === 401 || error?.status === 403
      ) {
        throw error;
      }

      if (i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 3s...
        const waitTime = delay * (i + 1);
        console.warn(
          `[Retry] Operation failed, retrying in ${waitTime}ms... (${
            i + 1
          }/${maxRetries})`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
