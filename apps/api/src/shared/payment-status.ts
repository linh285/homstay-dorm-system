/** Payment.status remains a database String; these constants keep reporting rules consistent. */
export const PaymentStatus = {
  CONFIRMED: 'CONFIRMED',
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  WAITING_MANAGER_CONFIRMATION: 'WAITING_MANAGER_CONFIRMATION',
  PAYMENT_RECHECK: 'PAYMENT_RECHECK',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentStatusValue =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const excludedFromFinancialReports = [
  PaymentStatus.PAYMENT_REJECTED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELLED,
] as const;
