import {
  familyNames,
  givenNames,
  middleNames,
  organizationNames,
  streets,
  vietnameseNames,
} from './constants.js';
import { addDays, dateOnly, type DbClient, type SeedContext, pad, pick } from './helpers.js';

// Compose a natural, varied full name from the name pools without a numeric suffix.
function fullNameFor(index: number): string {
  const family = familyNames[index % familyNames.length];
  const middle = middleNames[(index * 3 + 1) % middleNames.length];
  const given = givenNames[(index * 7 + 2) % givenNames.length];
  return `${family} ${middle} ${given}`;
}

export async function seedCustomers(db: DbClient, ctx: SeedContext): Promise<void> {
  const individualCount = Math.floor(ctx.config.customers * 0.8);

  for (let index = 1; index <= ctx.config.customers; index += 1) {
    const id = `KH${pad(index)}`;
    const customerType = index <= individualCount ? 'INDIVIDUAL' : 'ORGANIZATION';
    const customer = { id, customerType } as const;
    ctx.customers.push(customer);

    if (customerType === 'INDIVIDUAL') {
      ctx.individuals.push(customer);
    } else {
      ctx.organizations.push(customer);
    }
  }

  await db.customer.createMany({
    data: ctx.customers.map((customer, index) => {
      if (customer.customerType === 'INDIVIDUAL') {
        return {
          id: customer.id,
          customerType: customer.customerType,
          fullName: fullNameFor(index),
          organizationName: null,
          birthDate: dateOnly(addDays(ctx.now, -365 * (19 + (index % 24)))),
          gender: pick(['MALE', 'FEMALE', 'OTHER'], index),
          nationality: 'Việt Nam',
          identityDocumentType: index % 7 === 0 ? 'PASSPORT' : 'CCCD',
          identityDocumentNumber: `0792${pad(index + 1, 8)}`,
          taxCode: null,
          representativeName: null,
          phone: `09${pad(index + 1, 8)}`,
          email: `khach${pad(index + 1)}@demo.homestay.local`,
          address: pick(streets, index),
        };
      }

      return {
        id: customer.id,
        customerType: customer.customerType,
        fullName: null,
        organizationName: pick(organizationNames, index),
        birthDate: null,
        gender: null,
        nationality: 'Việt Nam',
        identityDocumentType: null,
        identityDocumentNumber: null,
        taxCode: `03${pad(index + 1, 8)}`,
        representativeName: `${pick(vietnameseNames, index)} - Đại diện`,
        phone: `028${pad(index + 1, 7)}`,
        email: `tochuc${pad(index + 1)}@demo.homestay.local`,
        address: pick(streets, index),
      };
    }),
    skipDuplicates: true,
  });
}
