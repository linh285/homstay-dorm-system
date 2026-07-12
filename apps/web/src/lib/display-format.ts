const metricLabels: Record<string, string> = {
  activeRentalRequests: 'Yêu cầu thuê đang hoạt động',
  todayViewings: 'Lịch xem hôm nay',
  depositsInProgress: 'Hồ sơ đặt cọc đang xử lý',
  scheduledCheckIns: 'Lịch nhận phòng',
  openCheckoutRequests: 'Yêu cầu trả phòng đang mở',
  depositsWaitingCalculation: 'Phiếu cọc chờ tính tiền',
  paymentsWaitingRecord: 'Thanh toán chờ ghi nhận',
  settlementsWaiting: 'Đối soát chờ xử lý',
  roomsWaitingApproval: 'Phòng chờ duyệt',
  depositsWaitingApproval: 'Cọc chờ duyệt',
  eligibilityReviews: 'Hồ sơ cư trú chờ duyệt',
  handoversWaiting: 'Bàn giao chờ xử lý',
  inspectionsWaiting: 'Kiểm tra trả phòng chờ xử lý',
  branches: 'Chi nhánh',
  employees: 'Nhân viên',
  rooms: 'Phòng',
  beds: 'Giường',
  totalBeds: 'Tổng số giường',
  availableBeds: 'Giường còn trống',
  heldBeds: 'Giường đang giữ chỗ',
  depositedBeds: 'Giường đã đặt cọc',
  occupiedBeds: 'Giường đang sử dụng',
  occupancyRate: 'Tỷ lệ lấp đầy',
  rentalRequests: 'Yêu cầu thuê',
  deposits: 'Đặt cọc',
  contracts: 'Hợp đồng',
  checkoutRequests: 'Yêu cầu trả phòng',
  todayViewingsCount: 'Lịch xem hôm nay',
  total: 'Tổng số',
  totalDepositAmount: 'Tổng tiền cọc',
  expiringWithin24Hours: 'Sắp hết hạn trong 24 giờ',
  depositReceived: 'Tiền cọc đã thu',
  refundPaid: 'Tiền hoàn cọc đã chi',
  additionalPaymentReceived: 'Tiền thu thêm',
  netCashFlow: 'Dòng tiền ròng',
  scope: 'Phạm vi',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  MAINTENANCE: 'Đang bảo trì',
  OUT_OF_SERVICE: 'Ngừng sử dụng',
  VIEWING: 'Đang xem phòng',
  DEPOSIT_PROCESS: 'Đang làm thủ tục cọc',
  CLOSED: 'Đã đóng',
  SCHEDULED: 'Đã lên lịch',
  CONFIRMED: 'Đã xác nhận',
  VISITED: 'Khách đã xem',
  RESULT_RECORDED: 'Đã ghi nhận kết quả',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Khách không đến',
  CUSTOMER_WANTS_DEPOSIT: 'Khách muốn đặt cọc',
  WANTS_MORE_VIEWINGS: 'Muốn xem thêm',
  WANTS_TO_CHANGE_CRITERIA: 'Muốn đổi tiêu chí',
  UNDECIDED: 'Chưa quyết định',
  NOT_INTERESTED: 'Không quan tâm',
  DRAFT: 'Bản nháp',
  WAITING_ROOM_CHECK: 'Chờ kiểm tra phòng',
  ROOM_APPROVED: 'Phòng đã duyệt',
  ROOM_REJECTED: 'Phòng bị từ chối',
  WAITING_PAYMENT: 'Chờ thanh toán',
  WAITING_MANAGER_CONFIRMATION: 'Chờ quản lý xác nhận',
  PAYMENT_RECHECK: 'Cần kiểm tra lại thanh toán',
  PAYMENT_REJECTED: 'Thanh toán bị từ chối',
  DEPOSITED: 'Đã đặt cọc',
  EXPIRED: 'Đã hết hạn',
  HELD: 'Đang giữ chỗ',
  OCCUPIED: 'Đang sử dụng',
  ENDED: 'Đã kết thúc',
  CHECKIN_DRAFT: 'Nháp nhận phòng',
  ARRIVED: 'Khách đã đến',
  WAITING_ELIGIBILITY: 'Chờ duyệt điều kiện cư trú',
  ELIGIBILITY_APPROVED: 'Đã duyệt điều kiện cư trú',
  CHECKIN_STOPPED: 'Dừng nhận phòng',
  PAPER_SIGNED: 'Đã ký hồ sơ giấy',
  WAITING_INITIAL_PAYMENT: 'Chờ thanh toán đầu kỳ',
  READY_FOR_HANDOVER: 'Sẵn sàng bàn giao',
  LIQUIDATED: 'Đã thanh lý',
  WAITING_INSPECTION: 'Chờ kiểm tra trả phòng',
  INSPECTED: 'Đã kiểm tra',
  WAITING_SETTLEMENT: 'Chờ đối soát',
  WAITING_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận',
  DISPUTED: 'Đang tranh chấp',
  WAITING_FINANCIAL_COMPLETION: 'Chờ hoàn tất tài chính',
  READY_TO_COMPLETE: 'Sẵn sàng hoàn tất',
  COMPLETED: 'Đã hoàn tất',
  NOT_REVIEWED: 'Chưa duyệt',
  ELIGIBLE: 'Đủ điều kiện',
  INELIGIBLE: 'Không đủ điều kiện',
  WHOLE_ROOM: 'Thuê nguyên phòng',
  SHARED_BEDS: 'Ở ghép',
  NORMAL: 'Bình thường',
  DAMAGED: 'Hư hỏng',
  MISSING: 'Thiếu tài sản',
  CLEANING_REQUIRED: 'Cần vệ sinh',
  SYSTEM: 'Toàn hệ thống',
  MALE: 'Nam',
  FEMALE: 'Nữ',
  ANY: 'Không phân biệt',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
  PLANNED: 'Dự kiến ở',
};

const currencyMetricKeys = new Set([
  'totalDepositAmount',
  'depositReceived',
  'refundPaid',
  'additionalPaymentReceived',
  'netCashFlow',
]);

const percentMetricKeys = new Set(['occupancyRate']);

export function formatMetricLabel(key: string): string | null {
  return metricLabels[key] ?? null;
}

export function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return statusLabels[value] ?? value;
}

export function formatScopeLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value === 'SYSTEM' ? 'Toàn hệ thống' : value;
}

export function formatCurrencyVnd(value: unknown): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value: unknown): string {
  const percent = Number(value ?? 0);
  return `${new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(percent) ? percent : 0)}%`;
}

export function formatMetricValue(
  key: string,
  value: unknown,
): string | number {
  if (currencyMetricKeys.has(key)) return formatCurrencyVnd(value);
  if (percentMetricKeys.has(key)) return formatPercent(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return '';
}

export function isKnownMetric(key: string): boolean {
  return key in metricLabels;
}
