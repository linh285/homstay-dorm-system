import { randomBytes } from 'node:crypto';

import { Prisma } from '../../generated/prisma/client.js';
import { RentalRequestRepository } from '../../data/repositories/rental-request.repository.js';
import { withTransaction } from '../../data/prisma/transaction.js';
import {
  assertBranchAccess,
  type BranchScopedUser,
} from '../authorization/branch-access.js';
import { AppError } from '../../shared/app-error.js';
import type {
  createRentalRequestSchema,
  customerSchema,
  listRentalRequestsSchema,
  memberSchema,
  updateRentalRequestSchema,
} from '../../presentation/validators/rental-request.validator.js';
import type { z } from 'zod';

type CreateRentalRequestInput = z.infer<typeof createRentalRequestSchema>;
type UpdateRentalRequestInput = z.infer<typeof updateRentalRequestSchema>;
type MemberInput = z.infer<typeof memberSchema>;
type ListRentalRequestsInput = z.infer<typeof listRentalRequestsSchema>;
type CustomerInput = z.infer<typeof customerSchema>;
type RentalRequestCreateFields = Pick<
  Prisma.RentalRequestUncheckedCreateInput,
  | 'expectedResidents'
  | 'rentalMode'
  | 'preferredRoomType'
  | 'preferredArea'
  | 'maximumBudget'
  | 'expectedCheckInDate'
  | 'rentalDurationMonths'
  | 'genderRequirement'
  | 'requiresAirConditioner'
  | 'requiresParking'
  | 'quietPreference'
  | 'acceptsSharedBeds'
  | 'livingSchedule'
  | 'note'
>;

export class RentalRequestService {
  constructor(private readonly repository = new RentalRequestRepository()) {}

  async list(user: BranchScopedUser, input: ListRentalRequestsInput) {
    const branchId = this.getSaleBranchId(user);
    if (input.branchId && input.branchId !== branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'Cannot list rental requests from another branch.',
      );
    }
    const filters: Prisma.RentalRequestWhereInput[] = [];
    if (input.customerName) {
      filters.push({
        representative: {
          is: {
            OR: [
              {
                fullName: { contains: input.customerName, mode: 'insensitive' },
              },
              {
                organizationName: {
                  contains: input.customerName,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      });
    }
    if (input.phone) {
      filters.push({
        representative: { is: { phone: { contains: input.phone } } },
      });
    }
    const where: Prisma.RentalRequestWhereInput = {
      branchId,
      ...(input.id ? { id: { contains: input.id, mode: 'insensitive' } } : {}),
      ...(filters.length ? { AND: filters } : {}),
      ...(input.rentalMode ? { rentalMode: input.rentalMode } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.expectedCheckInDate
        ? { expectedCheckInDate: new Date(input.expectedCheckInDate) }
        : {}),
    };
    const [items, totalItems] = await this.repository.findMany(
      where,
      input.page,
      input.pageSize,
      { [input.sortBy]: input.sortOrder },
    );
    return { items, totalItems, page: input.page, pageSize: input.pageSize };
  }

  async get(user: BranchScopedUser, id: string) {
    const request = await this.getAccessibleRequest(user, id);
    return request;
  }

  async searchRooms(user: BranchScopedUser, id: string) {
    this.getSaleBranchId(user);
    const request = await this.getAccessibleRequest(user, id);
    this.assertEditable(request.status);
    if (request.members.length !== request.expectedResidents) {
      throw new AppError(
        422,
        'MEMBER_COUNT_INCOMPLETE',
        'Members must equal expected residents before searching rooms.',
      );
    }

    const rooms = await this.repository.findRoomsForMatching(request.branchId);
    return rooms
      .map((room) => this.toRoomMatch(request, room))
      .filter((room): room is NonNullable<typeof room> => room !== null)
      .sort(
        (left, right) =>
          right.matchScore - left.matchScore ||
          right.availableBedCount - left.availableBedCount ||
          new Prisma.Decimal(left.monthlyRent).comparedTo(right.monthlyRent) ||
          left.roomId.localeCompare(right.roomId),
      );
  }

  async create(user: BranchScopedUser, input: CreateRentalRequestInput) {
    const branchId = this.getSaleBranchId(user);
    if (input.rentalRequest.branchId !== branchId) {
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'Rental request must belong to your branch.',
      );
    }

    return withTransaction(async (transaction) => {
      const customer = await this.repository.createCustomer(
        this.toCustomerCreateData(input.customer, this.createId('CUS')),
        transaction,
      );
      return this.repository.createRentalRequest(
        {
          id: this.createId('REQ'),
          representativeId: customer.id,
          branchId,
          saleEmployeeId: user.id,
          registeredAt: new Date(),
          ...this.toRentalRequestCreateData(input.rentalRequest),
          status: 'ACTIVE',
        },
        transaction,
      );
    });
  }

  async update(
    user: BranchScopedUser,
    id: string,
    input: UpdateRentalRequestInput,
  ) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const request = await this.getAccessibleRequest(user, id, transaction);
      this.assertEditable(request.status);
      const requestPatch = input.rentalRequest;
      if (
        requestPatch?.branchId &&
        requestPatch.branchId !== request.branchId
      ) {
        throw new AppError(
          403,
          'BRANCH_ACCESS_DENIED',
          'Cannot move a request to another branch.',
        );
      }
      if (
        requestPatch?.expectedResidents !== undefined &&
        request.members.length > requestPatch.expectedResidents
      ) {
        throw new AppError(
          422,
          'MEMBER_COUNT_EXCEEDS_EXPECTED_RESIDENTS',
          'Expected residents cannot be lower than current members.',
        );
      }
      if (input.customer) {
        await this.repository.updateCustomer(
          request.representativeId,
          this.toCustomerUpdateData(input.customer),
          transaction,
        );
      }
      return this.repository.updateRentalRequest(
        id,
        requestPatch ? this.toRentalRequestData(requestPatch) : {},
        transaction,
      );
    });
  }

  async addMember(user: BranchScopedUser, id: string, input: MemberInput) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const request = await this.getAccessibleRequest(user, id, transaction);
      this.assertEditable(request.status);
      if (request.members.length >= request.expectedResidents) {
        throw new AppError(
          422,
          'MEMBER_COUNT_EXCEEDS_EXPECTED_RESIDENTS',
          'Members cannot exceed expected residents.',
        );
      }
      const customer = await this.repository.createCustomer(
        this.toCustomerCreateData(input.customer, this.createId('CUS')),
        transaction,
      );
      return this.repository.createMember(
        {
          rentalRequestId: id,
          customerId: customer.id,
          isRepresentative: false,
          eligibilityResult: 'NOT_REVIEWED',
          participationStatus: 'PLANNED',
        },
        transaction,
      );
    });
  }

  async updateMember(
    user: BranchScopedUser,
    id: string,
    memberId: string,
    input: MemberInput,
  ) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const request = await this.getAccessibleRequest(user, id, transaction);
      this.assertEditable(request.status);
      const member = await this.repository.findMember(
        id,
        memberId,
        transaction,
      );
      if (!member)
        throw new AppError(404, 'NOT_FOUND', 'Request member was not found.');
      return this.repository.updateCustomer(
        memberId,
        this.toCustomerUpdateData(input.customer),
        transaction,
      );
    });
  }

  async deleteMember(user: BranchScopedUser, id: string, memberId: string) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const request = await this.getAccessibleRequest(user, id, transaction);
      this.assertEditable(request.status);
      const member = await this.repository.findMember(
        id,
        memberId,
        transaction,
      );
      if (!member)
        throw new AppError(404, 'NOT_FOUND', 'Request member was not found.');
      await this.repository.deleteMember(id, memberId, transaction);
    });
  }

  async close(user: BranchScopedUser, id: string) {
    this.getSaleBranchId(user);
    return withTransaction(async (transaction) => {
      const request = await this.getAccessibleRequest(user, id, transaction);
      if (request.status !== 'ACTIVE' && request.status !== 'VIEWING') {
        throw new AppError(
          409,
          'INVALID_STATE_TRANSITION',
          'Only ACTIVE or VIEWING requests can be closed.',
        );
      }
      return this.repository.updateRentalRequest(
        id,
        { status: 'CLOSED' },
        transaction,
      );
    });
  }

  private async getAccessibleRequest(
    user: BranchScopedUser,
    id: string,
    client?: Parameters<RentalRequestRepository['findById']>[1],
  ) {
    const request = await this.repository.findById(id, client);
    if (!request)
      throw new AppError(404, 'NOT_FOUND', 'Rental request was not found.');
    assertBranchAccess(user, request.branchId);
    return request;
  }

  private getSaleBranchId(user: BranchScopedUser): string {
    if (user.role !== 'SALE') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only SALE can manage rental requests.',
      );
    }
    if (!user.branchId)
      throw new AppError(
        403,
        'BRANCH_ACCESS_DENIED',
        'SALE must belong to a branch.',
      );
    return user.branchId;
  }

  private assertEditable(status: string): void {
    if (status !== 'ACTIVE' && status !== 'VIEWING') {
      throw new AppError(
        409,
        'INVALID_STATE_TRANSITION',
        'The rental request can no longer be edited.',
      );
    }
  }

  private toRoomMatch(
    request: Awaited<ReturnType<RentalRequestRepository['findById']>>,
    room: Awaited<
      ReturnType<RentalRequestRepository['findRoomsForMatching']>
    >[number],
  ) {
    if (!request) return null;
    const availableBeds = room.beds.filter(
      (bed) =>
        bed.operationalStatus === 'ACTIVE' && bed.allocations.length === 0,
    );
    const genderCompatible = this.isGenderCompatible(
      request.genderRequirement,
      room.genderPolicy,
    );
    if (!genderCompatible) return null;
    if (request.requiresAirConditioner && !room.hasAirConditioner) return null;
    if (request.requiresParking && !room.hasParking) return null;

    const selectedBeds =
      request.rentalMode === 'WHOLE_ROOM' ? room.beds : availableBeds;
    const hasRequiredBeds =
      request.rentalMode === 'WHOLE_ROOM'
        ? room.beds.length > 0 && availableBeds.length === room.beds.length
        : request.acceptsSharedBeds === true &&
          availableBeds.length >= request.expectedResidents;
    if (!hasRequiredBeds || request.expectedResidents > room.maximumCapacity) {
      return null;
    }

    const pricedBeds =
      request.rentalMode === 'WHOLE_ROOM'
        ? selectedBeds
        : [...selectedBeds]
            .sort((left, right) =>
              left.monthlyRent.comparedTo(right.monthlyRent),
            )
            .slice(0, request.expectedResidents);
    const monthlyRent = pricedBeds
      .reduce((sum, bed) => sum.add(bed.monthlyRent), new Prisma.Decimal(0))
      .toFixed(2);
    const matchedPreferences = [
      `Đủ ${request.expectedResidents} giường khả dụng`,
      'Phù hợp chính sách giới tính',
      ...(request.requiresAirConditioner ? ['Có điều hòa'] : []),
      ...(request.requiresParking ? ['Có chỗ gửi xe'] : []),
    ];
    const unmatchedPreferences: string[] = [];
    this.addOptionalPreference(
      request.preferredArea,
      room.area,
      'Khu vực',
      matchedPreferences,
      unmatchedPreferences,
    );
    this.addOptionalPreference(
      request.preferredRoomType,
      room.roomType,
      'Loại phòng',
      matchedPreferences,
      unmatchedPreferences,
    );
    if (request.maximumBudget) {
      const budgetMatches = new Prisma.Decimal(monthlyRent).lessThanOrEqualTo(
        request.maximumBudget,
      );
      (budgetMatches ? matchedPreferences : unmatchedPreferences).push(
        budgetMatches ? 'Trong ngân sách' : 'Vượt ngân sách mong muốn',
      );
    }
    const quietLevel = room.quietLevel?.trim().toUpperCase() ?? null;
    const matchScore = request.quietPreference
      ? quietLevel === 'HIGH'
        ? 2
        : quietLevel === 'MEDIUM'
          ? 1
          : 0
      : 0;
    if (request.quietPreference) {
      (matchScore > 0 ? matchedPreferences : unmatchedPreferences).push(
        matchScore > 0
          ? 'Mức độ yên tĩnh đạt ưu tiên'
          : 'Mức độ yên tĩnh chưa đạt ưu tiên',
      );
    }

    return {
      roomId: room.id,
      roomName: room.name,
      matchScore,
      matchedPreferences,
      unmatchedPreferences,
      availableBedCount: availableBeds.length,
      availableBeds: availableBeds.map((bed) => ({
        id: bed.id,
        name: bed.name,
        monthlyRent: bed.monthlyRent.toFixed(2),
      })),
      roomType: room.roomType,
      area: room.area,
      genderPolicy: room.genderPolicy,
      quietLevel: room.quietLevel,
      curfew: room.curfew,
      rules: room.rules,
      services: room.services.map((item) => ({
        id: item.service.id,
        name: item.service.name,
        unit: item.service.unit,
        unitPrice: (item.customPrice ?? item.service.unitPrice).toFixed(2),
      })),
      assets: room.assets.map((item) => ({
        id: item.id,
        name: item.assetType.name,
        quantity: item.quantity,
        currentCondition: item.currentCondition,
      })),
      monthlyRent,
    };
  }

  private addOptionalPreference(
    expected: string | null,
    actual: string | null,
    label: string,
    matched: string[],
    unmatched: string[],
  ) {
    if (!expected) return;
    const isMatch =
      actual !== null &&
      expected.trim().toUpperCase() === actual.trim().toUpperCase();
    (isMatch ? matched : unmatched).push(
      isMatch ? `${label} phù hợp` : `${label} chưa phù hợp`,
    );
  }

  private isGenderCompatible(
    requirement: string | null,
    policy: string | null,
  ) {
    const normalizedRequirement = requirement?.trim().toUpperCase() ?? null;
    const normalizedPolicy = policy?.trim().toUpperCase() ?? null;
    if (!normalizedRequirement || normalizedRequirement === 'ANY') return true;
    if (!normalizedPolicy) return false;
    return (
      normalizedPolicy === 'ANY' || normalizedPolicy === normalizedRequirement
    );
  }

  private createId(prefix: string): string {
    return `${prefix}-${randomBytes(8).toString('hex')}`;
  }

  private toCustomerCreateData(
    customer: CustomerInput,
    id: string,
  ): Prisma.CustomerCreateInput {
    return {
      id,
      ...this.toCustomerUpdateData(customer),
    } as Prisma.CustomerCreateInput;
  }

  private toCustomerUpdateData(
    customer: CustomerInput,
  ): Prisma.CustomerUpdateInput {
    if (customer.customerType === 'INDIVIDUAL') {
      return {
        customerType: 'INDIVIDUAL',
        fullName: customer.fullName,
        organizationName: null,
        birthDate: customer.birthDate ? new Date(customer.birthDate) : null,
        gender: customer.gender ?? null,
        nationality: customer.nationality ?? null,
        identityDocumentType: customer.identityDocumentType ?? null,
        identityDocumentNumber: customer.identityDocumentNumber ?? null,
        taxCode: null,
        representativeName: null,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        address: customer.address ?? null,
      };
    }
    return {
      customerType: 'ORGANIZATION',
      fullName: null,
      organizationName: customer.organizationName,
      birthDate: null,
      gender: null,
      nationality: null,
      identityDocumentType: null,
      identityDocumentNumber: null,
      taxCode: customer.taxCode ?? null,
      representativeName: customer.representativeName,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      address: customer.address ?? null,
    };
  }

  private toRentalRequestData(
    input: Partial<CreateRentalRequestInput['rentalRequest']>,
  ): Prisma.RentalRequestUncheckedUpdateInput {
    return {
      ...input,
      branchId: undefined,
      expectedCheckInDate: input.expectedCheckInDate
        ? new Date(input.expectedCheckInDate)
        : undefined,
    };
  }

  private toRentalRequestCreateData(
    input: CreateRentalRequestInput['rentalRequest'],
  ): RentalRequestCreateFields {
    return {
      expectedResidents: input.expectedResidents,
      rentalMode: input.rentalMode,
      preferredRoomType: input.preferredRoomType ?? null,
      preferredArea: input.preferredArea ?? null,
      maximumBudget: input.maximumBudget ?? null,
      expectedCheckInDate: new Date(input.expectedCheckInDate),
      rentalDurationMonths: input.rentalDurationMonths,
      genderRequirement: input.genderRequirement ?? null,
      requiresAirConditioner: input.requiresAirConditioner ?? null,
      requiresParking: input.requiresParking ?? null,
      quietPreference: input.quietPreference ?? null,
      acceptsSharedBeds: input.acceptsSharedBeds ?? null,
      livingSchedule: input.livingSchedule ?? null,
      note: input.note ?? null,
    };
  }
}
