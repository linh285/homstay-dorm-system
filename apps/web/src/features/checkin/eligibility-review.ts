import type { ContractMember } from './checkin-api';

export function getEligibilityReviewBlockReason(
  members: Pick<ContractMember, 'plannedBedId' | 'identityChecked'>[],
): string | null {
  const assigned = members.filter((member) => member.plannedBedId);
  if (assigned.length === 0) {
    return 'Hãy gán ít nhất một người cư trú vào giường trước khi gửi Manager duyệt.';
  }
  if (assigned.some((member) => !member.identityChecked)) {
    return 'Hãy đối chiếu giấy tờ của tất cả người đã được gán giường trước khi gửi duyệt.';
  }
  return null;
}
