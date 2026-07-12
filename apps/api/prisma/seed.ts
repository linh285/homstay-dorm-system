import { prisma } from '../src/data/prisma/client.js';
import { seedAllocations } from './seed/allocations.js';
import { seedCheckouts } from './seed/checkouts.js';
import { seedContracts } from './seed/contracts.js';
import { seedCustomers } from './seed/customers.js';
import { seedDeposits } from './seed/deposits.js';
import { ensureDemoEnvironment, createSeedContext, resetDemoDataIfAllowed } from './seed/helpers.js';
import { seedOrganizations } from './seed/organizations.js';
import { seedRentalRequests } from './seed/rental-requests.js';
import { seedRooms } from './seed/rooms.js';
import { printScenarioSummary } from './seed/scenarios.js';
import { verifySeed, printStats } from './seed/verify.js';
import { seedViewings } from './seed/viewings.js';

async function main() {
  ensureDemoEnvironment();

  const startedAt = Date.now();
  const ctx = await createSeedContext();

  console.info(`Starting HomeStay Dorm seed with profile "${ctx.profile}".`);
  console.info(`ALLOW_DEMO_RESET=${process.env.ALLOW_DEMO_RESET === 'true' ? 'true' : 'false'}`);

  const stats = await prisma.$transaction(
    async (tx) => {
      await resetDemoDataIfAllowed(tx);
      await seedOrganizations(tx, ctx);
      await seedRooms(tx, ctx);
      await seedCustomers(tx, ctx);
      await seedRentalRequests(tx, ctx);
      await seedViewings(tx, ctx);
      await seedDeposits(tx, ctx);
      await seedContracts(tx, ctx);
      await seedCheckouts(tx, ctx);
      await seedAllocations(tx, ctx);

      return verifySeed(tx, ctx.profile);
    },
    {
      maxWait: 15_000,
      timeout: 180_000,
    },
  );

  console.info(`Seed completed in ${Date.now() - startedAt}ms.`);
  printStats(stats);
  printScenarioSummary();
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error('HomeStay Dorm seed failed.');
    console.error(error);
    process.exitCode = 1;
  });
