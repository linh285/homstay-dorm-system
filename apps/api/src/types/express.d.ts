import type { Role } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: unknown;
      validatedParams?: Record<string, string>;
      validatedQuery?: unknown;
      currentUser?: {
        id: string;
        role: Role;
        branchId: string | null;
      };
    }
  }
}

export {};
