import { render } from '@testing-library/react';

import { Footer } from './Footer';

describe('Footer CLS optimization', () => {
  it('renders img with width and height attributes to prevent layout shift', () => {
    render(<Footer />);

    const img = document.querySelector('img[alt="Gumucio Propiedades"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('width', '1280');
    expect(img).toHaveAttribute('height', '284');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('renders picture element with webp source', () => {
    render(<Footer />);

    const source = document.querySelector('source[type="image/webp"]');
    expect(source).toBeInTheDocument();
    expect(source).toHaveAttribute('srcset', '/footer-logo.webp');
  });

  // Note: aspectRatio '1280 / 284' is set via MUI sx on the Box wrapper (CSS-in-JS).
  // JSDOM does not compute inline styles from MUI sx, so we assert structural integrity instead.
  it('renders a Box wrapper containing the picture element', () => {
    const { container } = render(<Footer />);

    const picture = container.querySelector('picture');
    expect(picture).toBeInTheDocument();
    expect(picture?.parentElement?.tagName.toLowerCase()).toBe('div');
  });
});
