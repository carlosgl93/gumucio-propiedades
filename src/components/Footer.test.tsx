import { render } from '@testing-library/react';

import { Footer } from './Footer';

describe('Footer CLS optimization', () => {
  it('renders img with width and fetchpriority to prevent layout shift', () => {
    render(<Footer />);

    const img = document.querySelector('img[alt="Gumucio Propiedades"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('width', '1280');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('wraps img in a picture with aspect-ratio for intrinsic sizing', () => {
    const { container } = render(<Footer />);

    const picture = container.querySelector('picture');
    expect(picture).toBeInTheDocument();
    // Parent Box carries aspectRatio: '1280 / 284' via MUI sx.
    // JSDOM does not compute inline styles from MUI sx, so we assert the
    // structural intent (picture with inline style carrying the aspect ratio).
    const pictureStyle = (picture as HTMLElement | null)?.getAttribute('style') ?? '';
    expect(pictureStyle).toContain('aspect-ratio');
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
