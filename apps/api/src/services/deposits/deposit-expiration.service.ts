import { DepositRepository } from '../../data/repositories/deposit.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';

/**
 * Expires deposit holds whose 24-hour payment window has elapsed.
 * Idempotent: only deposits still in WAITING_PAYMENT with an active HELD
 * allocation are affected, so repeated runs neither double-end allocations
 * nor touch WAITING_MANAGER_CONFIRMATION / DEPOSITED / CANCELLED deposits.
 */
export class DepositExpirationService {
  constructor(private readonly repository = new DepositRepository()) {}

  async run(now: Date = new Date()): Promise<number> {
    const expired = await this.repository.findExpiredWaitingPayments(now);
    let processed = 0;
    for (const { id } of expired) {
      await withTransaction(async (tx) => {
        const deposit = await this.repository.findById(id, tx);
        if (!deposit || deposit.status !== 'WAITING_PAYMENT') return;
        const payment = await this.repository.findDepositPayment(id, tx);
        if (
          !payment ||
          !payment.expiresAt ||
          payment.status !== 'WAITING_PAYMENT' ||
          payment.expiresAt > now
        ) {
          return;
        }
        await this.repository.updatePayment(
          payment.id,
          { status: 'EXPIRED' },
          tx,
        );
        await this.repository.endActiveAllocationsByDeposit(id, now, tx);
        await this.repository.updateDeposit(id, { status: 'EXPIRED' }, tx);
        processed += 1;
      });
    }
    return processed;
  }
}
