import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Property } from '@/models';

import { PropertyForm } from './PropertyForm';

const mockMutateAsyncCreate = vi.fn();
const mockMutateAsyncUpdate = vi.fn();

vi.mock('../hooks/useProperties', () => ({
  useCreateProperty: () => ({
    mutateAsync: mockMutateAsyncCreate,
    isPending: false,
    error: null,
  }),
  useUpdateProperty: () => ({
    mutateAsync: mockMutateAsyncUpdate,
    isPending: false,
    error: null,
  }),
  useUploadPropertyImage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeletePropertyImage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('PropertyForm - Decimal input handling', () => {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clean empty inputs in create mode (no initial zeros)', () => {
    render(<PropertyForm onSave={onSave} onCancel={onCancel} />);

    const priceInput = screen.getByLabelText(/precio/i) as HTMLInputElement;
    const bathroomsInput = screen.getByLabelText(/baños/i) as HTMLInputElement;
    const totalAreaInput = screen.getByLabelText(/superficie total/i) as HTMLInputElement;
    const builtAreaInput = screen.getByLabelText(/superficie construida/i) as HTMLInputElement;

    expect(priceInput.value).toBe('');
    expect(bathroomsInput.value).toBe('');
    expect(totalAreaInput.value).toBe('');
    expect(builtAreaInput.value).toBe('');
  });

  it('formats decimals with comma when loading an existing property for edit', () => {
    const existingProperty: Property = {
      id: 'prop-1',
      title: 'Departamento Vista Mar',
      description: 'Hermoso departamento con vista al mar y amplios espacios',
      type: 'rent',
      price: 15.5,
      currency: 'UF',
      propertyType: 'departamento',
      status: 'disponible',
      address: {
        street: 'Av. Costanera 100',
        city: 'Viña del Mar',
        commune: 'Viña del Mar',
        region: 'Valparaíso',
        country: 'Chile',
      },
      features: {
        bedrooms: 2,
        bathrooms: 1.5,
        parkingSpaces: 1,
        totalArea: 80.5,
        builtArea: 65.5,
        yearBuilt: 2020,
      },
      amenities: [],
      images: [],
      contactInfo: {
        phone: '+56 9 1234 5678',
        email: 'contacto@test.cl',
      },
      isActive: true,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<PropertyForm property={existingProperty} onSave={onSave} onCancel={onCancel} />);

    const priceInput = screen.getByLabelText(/precio/i) as HTMLInputElement;
    const bathroomsInput = screen.getByLabelText(/baños/i) as HTMLInputElement;
    const totalAreaInput = screen.getByLabelText(/superficie total/i) as HTMLInputElement;
    const builtAreaInput = screen.getByLabelText(/superficie construida/i) as HTMLInputElement;

    expect(priceInput.value).toBe('15,5');
    expect(bathroomsInput.value).toBe('1,5');
    expect(totalAreaInput.value).toBe('80,5');
    expect(builtAreaInput.value).toBe('65,5');
  });

  it('preserves comma while typing without resetting state', () => {
    render(<PropertyForm onSave={onSave} onCancel={onCancel} />);

    const priceInput = screen.getByLabelText(/precio/i) as HTMLInputElement;

    fireEvent.change(priceInput, { target: { value: '15,' } });
    expect(priceInput.value).toBe('15,');

    fireEvent.change(priceInput, { target: { value: '15,5' } });
    expect(priceInput.value).toBe('15,5');
  });

  it('rejects multiple commas and non-numeric characters', () => {
    render(<PropertyForm onSave={onSave} onCancel={onCancel} />);

    const priceInput = screen.getByLabelText(/precio/i) as HTMLInputElement;

    fireEvent.change(priceInput, { target: { value: '15,5' } });
    expect(priceInput.value).toBe('15,5');

    // Attempt second comma
    fireEvent.change(priceInput, { target: { value: '15,5,' } });
    expect(priceInput.value).toBe('15,5');

    // Attempt letters
    fireEvent.change(priceInput, { target: { value: '15,5abc' } });
    expect(priceInput.value).toBe('15,5');
  });

  it('submits parsed float values in payload when editing existing property', async () => {
    mockMutateAsyncUpdate.mockResolvedValueOnce({});

    const existingProperty: Property = {
      id: 'prop-1',
      title: 'Departamento Vista Mar',
      description: 'Hermoso departamento con vista al mar y amplios espacios',
      type: 'rent',
      price: 15,
      currency: 'UF',
      propertyType: 'departamento',
      status: 'disponible',
      address: {
        street: 'Av. Costanera 100',
        city: 'Viña del Mar',
        commune: 'Viña del Mar',
        region: 'Valparaíso',
        country: 'Chile',
      },
      features: {
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: 1,
        totalArea: 80,
        builtArea: 65,
        yearBuilt: 2020,
      },
      amenities: [],
      images: [],
      contactInfo: {
        phone: '+56 9 1234 5678',
        email: 'contacto@test.cl',
      },
      isActive: true,
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<PropertyForm property={existingProperty} onSave={onSave} onCancel={onCancel} />);

    const priceInput = screen.getByLabelText(/precio/i) as HTMLInputElement;
    const bathroomsInput = screen.getByLabelText(/baños/i) as HTMLInputElement;
    const totalAreaInput = screen.getByLabelText(/superficie total/i) as HTMLInputElement;
    const builtAreaInput = screen.getByLabelText(/superficie construida/i) as HTMLInputElement;

    // Change to decimals
    fireEvent.change(priceInput, { target: { value: '15,5' } });
    fireEvent.change(bathroomsInput, { target: { value: '1,5' } });
    fireEvent.change(totalAreaInput, { target: { value: '80,5' } });
    fireEvent.change(builtAreaInput, { target: { value: '65,5' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /actualizar propiedad/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsyncUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prop-1',
          updates: expect.objectContaining({
            price: 15.5,
            features: expect.objectContaining({
              bathrooms: 1.5,
              totalArea: 80.5,
              builtArea: 65.5,
            }),
          }),
        }),
      );
    });
  });
});
