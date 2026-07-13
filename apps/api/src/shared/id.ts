import type { Prisma, PrismaClient } from '../generated/prisma/client.js';

type Client = PrismaClient | Prisma.TransactionClient;

/** Models whose string primary keys we auto-number with a human-readable prefix. */
export type NumberedModel =
  | 'room'
  | 'bed'
  | 'roomAsset'
  | 'viewing'
  | 'deposit'
  | 'payment'
  | 'paymentDetail'
  | 'bedAllocation'
  | 'contract'
  | 'handover'
  | 'checkoutRequest'
  | 'checkoutInspection'
  | 'checkoutInspectionItem'
  | 'settlement'
  | 'deduction'
  | 'customer'
  | 'rentalRequest';

type IdRow = { id: string };
type IdDelegate = {
  findMany(args: {
    where: { id: { startsWith: string } };
    select: { id: true };
  }): Promise<IdRow[]>;
};

async function highestNumber(
  client: Client,
  model: NumberedModel,
  prefix: string,
): Promise<number> {
  const delegate = client[model] as unknown as IdDelegate;
  const rows = await delegate.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });
  let max = 0;
  for (const row of rows) {
    const suffix = row.id.slice(prefix.length);
    // Only ids of the exact form "<prefix><digits>" count, so e.g. prefix "C"
    // (contracts) is not confused by unrelated ids in the same table.
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix));
  }
  return max;
}

/** Returns the next sequential id, e.g. "P049", matching the seed convention. */
export async function nextId(
  client: Client,
  model: NumberedModel,
  prefix: string,
  padSize = 3,
): Promise<string> {
  const next = (await highestNumber(client, model, prefix)) + 1;
  return `${prefix}${next.toString().padStart(padSize, '0')}`;
}

/** Returns `count` consecutive sequential ids for bulk inserts. */
export async function nextIdSeries(
  client: Client,
  model: NumberedModel,
  prefix: string,
  count: number,
  padSize = 3,
): Promise<string[]> {
  const start = (await highestNumber(client, model, prefix)) + 1;
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${(start + index).toString().padStart(padSize, '0')}`,
  );
}
