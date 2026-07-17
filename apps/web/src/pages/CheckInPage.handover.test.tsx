import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Contract } from '../features/checkin/checkin-api.js';
import { HandoverControls } from './CheckInPage.js';

function readyContract(availableActions: string[]): Contract {
  return {
    status: 'READY_FOR_HANDOVER',
    availableActions,
    handover: null,
  } as Contract;
}

afterEach(cleanup);

describe('HandoverControls', () => {
  it('does not render a handover button for ACCOUNTANT at READY_FOR_HANDOVER', () => {
    render(
      <HandoverControls
        contract={readyContract([])}
        role="ACCOUNTANT"
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /bàn giao phòng/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Đã chuyển hồ sơ cho Manager bàn giao.'),
    ).toBeInTheDocument();
  });

  it('renders a handover button for MANAGER with the backend action', () => {
    render(
      <HandoverControls
        contract={readyContract(['open-handover'])}
        role="MANAGER"
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /bàn giao phòng/i }),
    ).toBeInTheDocument();
  });

  it('does not render a handover button for SALE at READY_FOR_HANDOVER', () => {
    render(
      <HandoverControls
        contract={readyContract([])}
        role="SALE"
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /bàn giao phòng/i }),
    ).not.toBeInTheDocument();
  });
});
