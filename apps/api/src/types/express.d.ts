import type { Role } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        role: Role;
        branchId: string | null;
      };
    }
  }
}

export {};
