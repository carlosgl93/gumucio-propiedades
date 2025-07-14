// utils/validation.ts
import { Property } from '@/models';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateProperty = (property: Partial<Property>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Basic Information
  if (!property.title?.trim()) {
    errors.push({ field: 'title', message: 'El título es requerido' });
  } else if (property.title.length < 10) {
    errors.push({ field: 'title', message: 'El título debe tener al menos 10 caracteres' });
  }

  if (!property.description?.trim()) {
    errors.push({ field: 'description', message: 'La descripción es requerida' });
  } else if (property.description.length < 20) {
    errors.push({
      field: 'description',
      message: 'La descripción debe tener al menos 20 caracteres',
    });
  }

  if (!property.price || property.price <= 0) {
    errors.push({ field: 'price', message: 'El precio debe ser mayor a 0' });
  } else if (property.price > 1000000000) {
    errors.push({ field: 'price', message: 'El precio es demasiado alto' });
  }

  if (!property.currency) {
    errors.push({ field: 'currency', message: 'La moneda es requerida' });
  }

  if (!property.propertyType) {
    errors.push({ field: 'propertyType', message: 'El tipo de propiedad es requerido' });
  }

  if (!property.status) {
    errors.push({ field: 'status', message: 'El estado es requerido' });
  }

  // Address validation
  if (!property.address?.street?.trim()) {
    errors.push({ field: 'address.street', message: 'La dirección es requerida' });
  }

  if (!property.address?.city?.trim()) {
    errors.push({ field: 'address.city', message: 'La ciudad es requerida' });
  }

  if (!property.address?.commune?.trim()) {
    errors.push({ field: 'address.commune', message: 'La comuna es requerida' });
  }

  if (!property.address?.region?.trim()) {
    errors.push({ field: 'address.region', message: 'La región es requerida' });
  }

  if (!property.address?.country?.trim()) {
    errors.push({ field: 'address.country', message: 'El país es requerido' });
  }

  // Features validation
  if (!property.features?.totalArea || property.features.totalArea <= 0) {
    errors.push({ field: 'features.totalArea', message: 'La superficie total debe ser mayor a 0' });
  } else if (property.features.totalArea > 100000) {
    errors.push({
      field: 'features.totalArea',
      message: 'La superficie total es demasiado grande',
    });
  }

  if (property.features?.bedrooms && property.features.bedrooms < 0) {
    errors.push({ field: 'features.bedrooms', message: 'Los dormitorios no pueden ser negativos' });
  }

  if (property.features?.bathrooms && property.features.bathrooms < 0) {
    errors.push({ field: 'features.bathrooms', message: 'Los baños no pueden ser negativos' });
  }

  if (property.features?.parkingSpaces && property.features.parkingSpaces < 0) {
    errors.push({
      field: 'features.parkingSpaces',
      message: 'Los estacionamientos no pueden ser negativos',
    });
  }

  if (property.features?.builtArea && property.features.builtArea < 0) {
    errors.push({
      field: 'features.builtArea',
      message: 'La superficie construida no puede ser negativa',
    });
  }

  if (
    property.features?.builtArea &&
    property.features?.totalArea &&
    property.features.builtArea > property.features.totalArea
  ) {
    errors.push({
      field: 'features.builtArea',
      message: 'La superficie construida no puede ser mayor a la superficie total',
    });
  }

  if (property.features?.yearBuilt) {
    const currentYear = new Date().getFullYear();
    if (property.features.yearBuilt < 1800 || property.features.yearBuilt > currentYear + 2) {
      errors.push({
        field: 'features.yearBuilt',
        message: `El año de construcción debe estar entre 1800 y ${currentYear + 2}`,
      });
    }
  }

  // Contact validation
  if (!property.contactInfo?.phone?.trim()) {
    errors.push({ field: 'contactInfo.phone', message: 'El teléfono es requerido' });
  } else if (!/^\+56\s?9\s?\d{4}\s?\d{4}$/.test(property.contactInfo.phone.replace(/\s/g, ''))) {
    errors.push({
      field: 'contactInfo.phone',
      message: 'Formato de teléfono inválido (+56 9 XXXX XXXX)',
    });
  }

  if (!property.contactInfo?.email?.trim()) {
    errors.push({ field: 'contactInfo.email', message: 'El email es requerido' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(property.contactInfo.email)) {
    errors.push({ field: 'contactInfo.email', message: 'Formato de email inválido' });
  }

  // WhatsApp validation (optional but format check if provided)
  if (
    property.contactInfo?.whatsapp?.trim() &&
    !/^\+56\s?9\s?\d{4}\s?\d{4}$/.test(property.contactInfo.whatsapp.replace(/\s/g, ''))
  ) {
    errors.push({
      field: 'contactInfo.whatsapp',
      message: 'Formato de WhatsApp inválido (+56 9 XXXX XXXX)',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper function to get error message for a specific field
export const getFieldError = (errors: ValidationError[], fieldPath: string): string | undefined => {
  return errors.find((error) => error.field === fieldPath)?.message;
};

// Helper function to check if a field has errors
export const hasFieldError = (errors: ValidationError[], fieldPath: string): boolean => {
  return errors.some((error) => error.field === fieldPath);
};

// Utility to format Chilean phone numbers
export const formatChileanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('569')) {
    const number = cleaned.substring(3);
    if (number.length === 8) {
      return `+56 9 ${number.substring(0, 4)} ${number.substring(4)}`;
    }
  }

  return phone; // Return original if can't format
};

// Utility to clean and validate numeric inputs
export const parseNumericInput = (value: string): number => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
