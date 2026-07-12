import type { Prisma } from '../../generated/prisma/client.js';

import { prisma } from './client.js';

export type TransactionClient = Prisma.TransactionClient;

export async function withTransaction<T>(
  callback: (transaction: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback);
}
