import { randomUUID } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../prisma/client.js';
import { BedAllocationRepository } from './bed-allocation.repository.js';

describe('BedAllocationRepository', () => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const branchId = `BR${suffix}`;
  const roomId = `RM${suffix}`;
  const bedId = `BD${suffix}`;
  const repository = new BedAllocationRepository(prisma);

  beforeEach(async () => {
    await prisma.bedAllocation.deleteMany({ where: { bedId } });
    await prisma.bed.deleteMany({ where: { id: bedId } });
    await prisma.room.deleteMany({ where: { id: roomId } });
    await prisma.branch.deleteMany({ where: { id: branchId } });

    await prisma.branch.create({
      data: {
        id: branchId,
        name: `Integration branch ${suffix}`,
        address: 'Test address',
        status: 'ACTIVE',
      },
    });
    await prisma.room.create({
      data: {
        id: roomId,
        branchId,
        name: `Room ${suffix}`,
        maximumCapacity: 1,
        operationalStatus: 'ACTIVE',
      },
    });
    await prisma.bed.create({
      data: {
        id: bedId,
        roomId,
        name: `Bed ${suffix}`,
        monthlyRent: new Prisma.Decimal('1500000.00'),
        operationalStatus: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.bedAllocation.deleteMany({ where: { bedId } });
    await prisma.bed.deleteMany({ where: { id: bedId } });
    await prisma.room.deleteMany({ where: { id: roomId } });
    await prisma.branch.deleteMany({ where: { id: branchId } });
    await prisma.$disconnect();
  });

  it('rejects a second ACTIVE allocation for the same bed', async () => {
    await repository.create({
      id: `AL1${suffix}`,
      bedId,
      allocationType: 'HELD',
      status: 'ACTIVE',
      startedAt: new Date(),
    });

    await expect(
      repository.create({
        id: `AL2${suffix}`,
        bedId,
        allocationType: 'HELD',
        status: 'ACTIVE',
        startedAt: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
