const vndFormatter = new Intl.NumberFormat('vi-VN');

/**
 * Formats a money value (decimal string like "1500000.00" or a number) as
 * Vietnamese đồng with thousand separators, e.g. "1.500.000 ₫".
 */
export function formatVnd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return String(value);
  return `${vndFormatter.format(amount)} ₫`;
}
