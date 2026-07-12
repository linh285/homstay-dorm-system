import { describe, expect, it } from 'vitest';

import {
  formatCurrencyVnd,
  formatMetricLabel,
  formatPercent,
  formatScopeLabel,
  formatStatusLabel,
} from './display-format';

describe('display format helpers', () => {
  it('formats metric labels, status labels, scope, currency, and percent', () => {
    expect(formatMetricLabel('totalBeds')).toBe('Tổng số giường');
    expect(formatScopeLabel('SYSTEM')).toBe('Toàn hệ thống');
    expect(formatStatusLabel('ACTIVE')).toBe('Đang hoạt động');
    expect(formatPercent(30.42)).toBe('30,42%');
    expect(formatCurrencyVnd('3000000.00')).toContain('3.000.000');
  });
});
