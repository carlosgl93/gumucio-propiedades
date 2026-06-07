import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Home from './Home';

describe('Home hero section LCP optimization', () => {
  it('renders an img with fetchpriority="high" inside the hero section', () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const img = container.querySelector('img[fetchpriority="high"]');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('/modern-house-bg.png');
  });

  it('renders a picture element with webp source', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const sources = document.querySelectorAll('source[type="image/webp"]');
    expect(sources.length).toBeGreaterThan(0);
    expect(sources[0].getAttribute('srcset')).toBe('/modern-house-bg.webp');
  });
});
