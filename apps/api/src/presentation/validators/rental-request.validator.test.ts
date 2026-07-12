import { describe, expect, it } from 'vitest';

import {
  createRentalRequestSchema,
  memberSchema,
} from './rental-request.validator.js';

describe('rental request validators', () => {
  const rentalRequest = {
    branchId: 'CN001',
    expectedResidents: 2,
    rentalMode: 'SHARED_BEDS',
    expectedCheckInDate: '2027-01-15',
    rentalDurationMonths: 12,
  };

  it('requires an organization name and representative for organization customers', () => {
    expect(
      createRentalRequestSchema.safeParse({
        customer: { customerType: 'ORGANIZATION', organizationName: 'Company' },
        rentalRequest,
      }).success,
    ).toBe(false);
  });

  it('only permits individual customers as request members', () => {
    expect(
      memberSchema.safeParse({
        customer: {
          customerType: 'ORGANIZATION',
          organizationName: 'Company',
          representativeName: 'Representative',
        },
      }).success,
    ).toBe(false);
  });
});
