import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlaceholderPage } from './pages/PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders its supplied title', () => {
    render(<PlaceholderPage title="Dashboard công việc" />);
    expect(
      screen.getByRole('heading', { name: 'Dashboard công việc' }),
    ).toBeInTheDocument();
  });
});
