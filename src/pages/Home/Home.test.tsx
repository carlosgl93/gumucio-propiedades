import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';

import Home from './Home';

describe('Home hero section', () => {
  it('renders hero CTA text', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByText('¿QUIERES EMPEZAR UN CAPÍTULO NUEVO?')).toBeInTheDocument();
  });
});
