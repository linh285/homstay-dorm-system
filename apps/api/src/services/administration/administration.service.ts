import type { Prisma } from '../../generated/prisma/client.js';
import { AdministrationRepository } from '../../data/repositories/administration.repository.js';
import { AppError } from '../../shared/app-error.js';

export class AdministrationService {
  constructor(private readonly repository = new AdministrationRepository()) {}

  listEmployees() {
    return this.repository.findEmployees();
  }
  listBranches() {
    return this.repository.findBranches();
  }

  async getBranch(id: string) {
    const branch = await this.repository.findBranchById(id);
    if (!branch) throw new AppError(404, 'NOT_FOUND', 'Branch was not found.');
    return branch;
  }

  async updateBranch(id: string, input: Prisma.BranchUpdateInput) {
    await this.getBranch(id);
    return this.repository.updateBranch(id, input);
  }
}
