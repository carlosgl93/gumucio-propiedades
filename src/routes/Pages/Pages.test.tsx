import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import Pages from './Pages';

vi.mock('../index', () => ({
  default: [],
}));

describe('Pages accessibility', () => {
  it('renders a main landmark for screen reader navigation', () => {
    render(
      <MemoryRouter>
        <Pages />
      </MemoryRouter>
    );

    const mainElement = document.querySelector('main');
    expect(mainElement).not.toBeNull();
  });
});
