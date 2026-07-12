import { DepositExpirationService } from '../services/deposits/deposit-expiration.service.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Starts the recurring job that expires deposit payment holds after 24 hours.
 * Returns a stop function so tests and shutdown hooks can clear the timer.
 */
export function startExpireDepositHoldsJob(
  intervalMs: number = FIVE_MINUTES_MS,
  service: DepositExpirationService = new DepositExpirationService(),
): () => void {
  const tick = () => {
    service.run().catch((error) => {
      console.error('Failed to expire deposit holds:', error);
    });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
