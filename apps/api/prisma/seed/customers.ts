import { organizationNames, streets, vietnameseNames } from './constants.js';
import { addDays, dateOnly, type DbClient, type SeedContext, pad, pick } from './helpers.js';

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
          fullName: `${pick(vietnameseNames, index)} ${pad(index + 1)}`,
          organizationName: null,
          birthDate: dateOnly(addDays(ctx.now, -365 * (19 + (index % 24)))),
          gender: pick(['MALE', 'FEMALE', 'OTHER'], index),
          nationality: 'Viet Nam',
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
        organizationName: `${pick(organizationNames, index)} ${pad(index + 1)}`,
        birthDate: null,
        gender: null,
        nationality: 'Viet Nam',
        identityDocumentType: null,
        identityDocumentNumber: null,
        taxCode: `03${pad(index + 1, 8)}`,
        representativeName: `${pick(vietnameseNames, index)} Dai dien`,
        phone: `028${pad(index + 1, 7)}`,
        email: `tochuc${pad(index + 1)}@demo.homestay.local`,
        address: pick(streets, index),
      };
    }),
    skipDuplicates: true,
  });
}
