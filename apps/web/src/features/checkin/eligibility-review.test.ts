import { describe, expect, it } from 'vitest';

import { getEligibilityReviewBlockReason } from './eligibility-review.js';

describe('getEligibilityReviewBlockReason', () => {
  it('blocks review when no resident is assigned', () => {
    expect(
      getEligibilityReviewBlockReason([
        { plannedBedId: null, identityChecked: false },
      ]),
    ).toContain('ít nhất một người cư trú');
  });

  it('blocks review when an assigned resident has not had identity checked', () => {
    expect(
      getEligibilityReviewBlockReason([
        { plannedBedId: 'B001', identityChecked: false },
      ]),
    ).toContain('đối chiếu giấy tờ');
  });

  it('allows review when every assigned resident has had identity checked', () => {
    expect(
      getEligibilityReviewBlockReason([
        { plannedBedId: 'B001', identityChecked: true },
      ]),
    ).toBeNull();
  });
});
