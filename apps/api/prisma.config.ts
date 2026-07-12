import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl =
  'postgresql://homestay:homestay_password@localhost:5432/homestay_dorm';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
