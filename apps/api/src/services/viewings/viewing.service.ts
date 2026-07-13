import type { Prisma } from '../../generated/prisma/client.js';
import { ViewingRepository } from '../../data/repositories/viewing.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import { nextId } from '../../shared/id.js';
import type {
  cancelSchema,
  confirmVisitedSchema,
  createViewingSchema,
  listViewingsSchema,
  noShowSchema,
  rescheduleSchema,
  resultSchema,
  updateViewingSchema,
} from '../../presentation/validators/viewing.validator.js';
import type { z } from 'zod';

type CreateInput = z.infer<typeof createViewingSchema>;
type UpdateInput = z.infer<typeof updateViewingSchema>;
type RescheduleInput = z.infer<typeof rescheduleSchema>;
type CancelInput = z.infer<typeof cancelSchema>;
type NoShowInput = z.infer<typeof noShowSchema>;
type ConfirmVisitedInput = z.infer<typeof confirmVisitedSchema>;
type ResultInput = z.infer<typeof resultSchema>;
type ListInput = z.infer<typeof listViewingsSchema>;

const resultToRequestStatus: Record<
  ResultInput['result'],
  'ACTIVE' | 'VIEWING' | 'DEPOSIT_PROCESS' | 'CLOSED'
> = {
  CUSTOMER_WANTS_DEPOSIT: 'DEPOSIT_PROCESS',
  WANTS_TO_CHANGE_CRITERIA: 'ACTIVE',
  NOT_INTERESTED: 'CLOSED',
  WANTS_MORE_VIEWINGS: 'VIEWING',
  UNDECIDED: 'VIEWING',
};

export class ViewingService {
  constructor(private readonly repository = new ViewingRepository()) {}

  async list(user: BranchScopedUser, input: ListInput) {
    const branchId = this.getSaleBranchId(user);
    const where: Prisma.ViewingWhereInput = {
      rentalRequest: { branchId },
      ...(input.rentalRequestId
        ? { rentalRequestId: input.rentalRequestId }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const [items, totalItems] = await this.repository.findMany(
      where,
      input.page,
      input.pageSize,
    );
    return { items, totalItems, page: input.page, pageSize: input.pageSize };
  }

  async get(user: BranchScopedUser, id: string) {
    return this.getAccessibleViewing(user, id);
  }

  async create(user: BranchScopedUser, input: CreateInput) {
    const branchId = this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const rentalRequest = await this.repository.findRentalRequest(
        input.rentalRequestId,
        transaction,
      );
      if (!rentalRequest)
        throw new AppError(404, 'NOT_FOUND', 'Rental request was not found.');
      assertBranchAccess(user, rentalRequest.branchId);
      if (
        rentalRequest.status !== 'ACTIVE' &&
        rentalRequest.status !== 'VIEWING'
      ) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'Viewings can only be scheduled for active rental requests.',
        );
      }
      const uniqueRoomIds = [...new Set(input.roomIds)];
      await this.assertRoomsInBranch(uniqueRoomIds, branchId, transaction);
      const viewing = await this.repository.createViewing(
        {
          id: await nextId(transaction, 'viewing', 'V'),
          rentalRequestId: input.rentalRequestId,
          saleEmployeeId: user.id,
          startsAt: new Date(input.startsAt),
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          status: 'SCHEDULED',
          notificationChannel: input.notificationChannel ?? null,
          notificationSent: input.notificationSent ?? false,
          note: input.note ?? null,
        },
        uniqueRoomIds,
        transaction,
      );
      if (rentalRequest.status === 'ACTIVE') {
        await this.repository.updateRentalRequestStatus(
          rentalRequest.id,
          'VIEWING',
          transaction,
        );
      }
      return viewing;
    });
  }

  async update(user: BranchScopedUser, id: string, input: UpdateInput) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const viewing = await this.getAccessibleViewing(user, id, transaction);
      if (viewing.status !== 'SCHEDULED' && viewing.status !== 'CONFIRMED') {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'Only scheduled or confirmed viewings can be edited.',
        );
      }
      if (input.roomIds) {
        const uniqueRoomIds = [...new Set(input.roomIds)];
        await this.assertRoomsInBranch(
          uniqueRoomIds,
          viewing.rentalRequest.branchId,
          transaction,
        );
        await this.repository.replaceDetails(id, uniqueRoomIds, transaction);
      }
      return this.repository.updateViewing(
        id,
        {
          startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
          endsAt:
            input.endsAt === undefined
              ? undefined
              : input.endsAt
                ? new Date(input.endsAt)
                : null,
          notificationChannel: input.notificationChannel,
          notificationSent: input.notificationSent,
          note: input.note,
        },
        transaction,
      );
    });
  }

  async confirm(user: BranchScopedUser, id: string) {
    return this.transition(user, id, ['SCHEDULED'], { status: 'CONFIRMED' });
  }

  async reschedule(user: BranchScopedUser, id: string, input: RescheduleInput) {
    return this.transition(user, id, ['SCHEDULED', 'CONFIRMED'], {
      status: 'SCHEDULED',
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    });
  }

  async cancel(user: BranchScopedUser, id: string, input: CancelInput) {
    return this.transition(user, id, ['SCHEDULED', 'CONFIRMED'], {
      status: 'CANCELLED',
      note: input.reason ?? undefined,
    });
  }

  async noShow(user: BranchScopedUser, id: string, input: NoShowInput) {
    return this.transition(user, id, ['CONFIRMED'], {
      status: 'NO_SHOW',
      note: input.note ?? undefined,
    });
  }

  async confirmVisited(
    user: BranchScopedUser,
    id: string,
    input: ConfirmVisitedInput,
  ) {
    return this.transition(user, id, ['CONFIRMED'], {
      status: 'VISITED',
      customerVisited: true,
      note: input.note ?? undefined,
    });
  }

  async recordResult(user: BranchScopedUser, id: string, input: ResultInput) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const viewing = await this.getAccessibleViewing(user, id, transaction);
      if (viewing.status !== 'VISITED') {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'Results can only be recorded after the customer has visited.',
        );
      }
      if (input.result === 'CUSTOMER_WANTS_DEPOSIT') {
        const selectedRoom = viewing.details.find(
          (detail) => detail.roomId === input.selectedRoomId,
        );
        if (!selectedRoom) {
          throw new AppError(
            422,
            'ROOM_NOT_IN_VIEWING',
            'The selected room is not part of this viewing.',
          );
        }
        await this.repository.markDetailInterested(
          id,
          input.selectedRoomId!,
          transaction,
        );
      }
      const updated = await this.repository.updateViewing(
        id,
        {
          status: 'RESULT_RECORDED',
          finalResult: input.result,
          followUpDate: input.followUpDate
            ? new Date(input.followUpDate)
            : null,
          note: input.note ?? undefined,
        },
        transaction,
      );
      await this.repository.updateRentalRequestStatus(
        viewing.rentalRequest.id,
        resultToRequestStatus[input.result],
        transaction,
      );
      return updated;
    });
  }

  private async transition(
    user: BranchScopedUser,
    id: string,
    from: string[],
    data: Prisma.ViewingUncheckedUpdateInput,
  ) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const viewing = await this.getAccessibleViewing(user, id, transaction);
      if (!from.includes(viewing.status)) {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          `This action is not allowed from status ${viewing.status}.`,
        );
      }
      return this.repository.updateViewing(id, data, transaction);
    });
  }

  private async assertRoomsInBranch(
    roomIds: string[],
    branchId: string,
    client: Parameters<ViewingRepository['findRoomsInBranch']>[2],
  ) {
    const rooms = await this.repository.findRoomsInBranch(
      roomIds,
      branchId,
      client,
    );
    if (rooms.length !== roomIds.length) {
      throw new AppError(
        422,
        'ROOM_NOT_IN_BRANCH',
        'One or more rooms do not exist in your branch.',
      );
    }
  }

  private async getAccessibleViewing(
    user: BranchScopedUser,
    id: string,
    client?: Parameters<ViewingRepository['findById']>[1],
  ) {
    const viewing = await this.repository.findById(id, client);
    if (!viewing)
      throw new AppError(404, 'NOT_FOUND', 'Viewing was not found.');
    assertBranchAccess(user, viewing.rentalRequest.branchId);
    return viewing;
  }

  private getSaleBranchId(user: BranchScopedUser): string {
    if (user.role !== 'SALE') {
      throw new AppError(403, 'FORBIDDEN', 'Only SALE can manage viewings.');
    }
    if (!user.branchId)
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'SALE must belong to a branch.',
      );
    return user.branchId;
  }
}
