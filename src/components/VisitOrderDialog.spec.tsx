import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Property } from '@/models';
import { generateVisitOrderPDF } from '@/utils/visitOrderPdf';

import { VisitOrderDialog } from './VisitOrderDialog';

vi.mock('@/utils/visitOrderPdf', () => ({
  generateVisitOrderPDF: vi.fn().mockResolvedValue(undefined),
}));

const mockProperty: Property = {
  id: 'prop-1234567890',
  title: 'Casa Quinta Machalí',
  description: 'Hermosa casa campestre',
  type: 'sale',
  price: 150000000,
  currency: 'CLP',
  propertyType: 'casa',
  status: 'disponible',
  address: {
    street: 'Los Aromos 450',
    commune: 'Machalí',
    city: 'Rancagua',
  },
  features: {
    bedrooms: 4,
    bathrooms: 3,
    builtArea: 180,
    totalArea: 500,
  },
  amenities: ['Piscina', 'Quincho'],
  images: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('VisitOrderDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders property title and address when open', () => {
    render(<VisitOrderDialog open={true} property={mockProperty} onClose={vi.fn()} />);

    expect(screen.getByText('Generar Orden de Visita')).toBeInTheDocument();
    expect(screen.getByText(/Casa Quinta Machalí/)).toBeInTheDocument();
    expect(screen.getByText(/Los Aromos 450, Machalí/)).toBeInTheDocument();
  });

  it('button is disabled when visitor name is empty', () => {
    render(<VisitOrderDialog open={true} property={mockProperty} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /generar pdf/i });
    expect(submitBtn).toBeDisabled();
  });

  it('calls generateVisitOrderPDF with property and visitorName on submit', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<VisitOrderDialog open={true} property={mockProperty} onClose={handleClose} />);

    const input = screen.getByLabelText(/nombre del visitante/i);
    await user.type(input, 'Carlos Perez');

    const submitBtn = screen.getByRole('button', { name: /generar pdf/i });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(generateVisitOrderPDF).toHaveBeenCalledWith(mockProperty, {
        visitorName: 'Carlos Perez',
      });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('handles error if PDF generation fails', async () => {
    vi.mocked(generateVisitOrderPDF).mockRejectedValueOnce(new Error('PDF error'));
    const user = userEvent.setup();

    render(<VisitOrderDialog open={true} property={mockProperty} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/nombre del visitante/i);
    await user.type(input, 'Carlos Perez');

    const submitBtn = screen.getByRole('button', { name: /generar pdf/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/error al generar el pdf/i);
    });
  });
});
