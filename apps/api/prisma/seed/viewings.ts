import { addDays, addHours, branchRooms, byBranch, pick, type DbClient, type SeedContext, pad, viewingResult, viewingStatus } from './helpers.js';

export async function seedViewings(db: DbClient, ctx: SeedContext): Promise<void> {
  const viewings = Array.from({ length: ctx.config.viewings }, (_unused, index) => {
    const request = pick(ctx.rentalRequests, index);
    const sale = byBranch(ctx.salesByBranch, request.branchId, index);
    const status = index === 0 ? 'CONFIRMED' : viewingStatus(index);
    const startsAt = index === 0 ? ctx.now : addDays(ctx.now, (index % 20) - 10);

    return {
      id: `V${pad(index + 1)}`,
      rentalRequestId: request.id,
      saleEmployeeId: sale.id,
      startsAt,
      endsAt: addHours(startsAt, 1),
      status,
      notificationSent: status !== 'SCHEDULED',
      notificationChannel: index % 2 === 0 ? 'PHONE' : 'ZALO',
      customerVisited: status === 'VISITED' || status === 'RESULT_RECORDED',
      finalResult: viewingResult(status, index),
      followUpDate: status === 'RESULT_RECORDED' ? addDays(ctx.now, 3) : null,
      note: index === 0 ? 'DEMO-VIEWING-TODAY: lịch xem hôm nay đã xác nhận.' : null,
    };
  });

  await db.viewing.createMany({
    data: viewings,
    skipDuplicates: true,
  });

  await db.viewingDetail.createMany({
    data: viewings.flatMap((viewing, index) => {
      const request = ctx.rentalRequests.find((item) => item.id === viewing.rentalRequestId);
      if (!request) {
        throw new Error(`Missing rental request for viewing ${viewing.id}.`);
      }

      const rooms = branchRooms(ctx, request.branchId);
      const detailCount = 1 + (index % 3);

      return Array.from({ length: detailCount }, (_unused, detailIndex) => {
        const room = pick(rooms, index + detailIndex);

        return {
          viewingId: viewing.id,
          roomId: room.id,
          viewedInPerson: viewing.customerVisited,
          customerInterested: viewing.finalResult === 'CUSTOMER_WANTS_DEPOSIT' || detailIndex === 0,
          note: 'Phòng được đưa vào lịch xem demo.',
        };
      });
    }),
    skipDuplicates: true,
  });
}
