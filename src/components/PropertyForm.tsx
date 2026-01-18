// components/PropertyForm.tsx
import { useEffect, useState } from 'react';

import { Close, CloudUpload, Delete, DragIndicator } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { email, phoneNumber } from '@/config';
import { Property } from '@/models';

import {
  useCreateProperty,
  useDeletePropertyImage,
  useUpdateProperty,
  useUploadPropertyImage,
} from '../hooks/useProperties';
import {
  ValidationError,
  formatChileanPhone,
  getFieldError,
  hasFieldError,
  parseNumericInput,
  validateProperty,
} from '../utils/validations';

interface PropertyFormProps {
  property?: Property | null;
  onSave: (property: Property) => void;
  onCancel: () => void;
}

const propertyTypes = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'comercial', label: 'Comercial' },
];

const statuses = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'arrendado', label: 'Arrendado' },
  { value: 'reservado', label: 'Reservado' },
];

const currencies = [
  { value: 'CLP', label: 'Pesos Chilenos (CLP)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'UF', label: 'Unidades de Fomento (UF)' },
];

const types = [
  { value: 'sale', label: 'Venta' },
  { value: 'rent', label: 'Arriendo' },
];

const commonAmenities = [
  'Piscina',
  'Gimnasio',
  'Seguridad 24/7',
  'Jardín',
  'Terraza',
  'Balcón',
  'Quincho',
  'Bodega',
  'Estacionamiento visitas',
  'Ascensor',
  'Calefacción central',
  'Aire acondicionado',
  'Pieza de servicio',
  'Baño de servicio',
];

export const PropertyForm = ({ property, onSave, onCancel }: PropertyFormProps) => {
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    description: '',
    type: 'rent',
    price: 0,
    currency: 'CLP',
    propertyType: 'casa',
    status: 'disponible',
    address: {
      street: '',
      city: '',
      commune: '',
      region: '',
      country: 'Chile',
    },
    features: {
      bedrooms: 0,
      bathrooms: 0,
      parkingSpaces: 0,
      totalArea: 0,
      builtArea: 0,
      yearBuilt: new Date().getFullYear(),
    },
    amenities: [],
    images: [],
    contactInfo: {
      phone: phoneNumber,
      email: email,
      whatsapp: phoneNumber,
    },
    isActive: true,
    isFeatured: false,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info' | 'success';
    persistent?: boolean;
  }>({ open: false, message: '', severity: 'info' });
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // TanStack Query mutations
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const uploadImage = useUploadPropertyImage();
  const deleteImage = useDeletePropertyImage();

  const isLoading = createProperty.isPending || updateProperty.isPending;
  const error = createProperty.error || updateProperty.error;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (property) {
      setFormData(property);
    }
  }, [property]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation errors for this field
    setValidationErrors((prev) => prev.filter((err) => err.field !== field));
  };

  const handleNestedInputChange = (
    parent: string,
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...((prev[parent as keyof Property] as Record<string, string | number | boolean>) || {}),
        [field]: value,
      },
    }));

    // Clear validation errors for this field
    const fieldPath = `${parent}.${field}`;
    setValidationErrors((prev) => prev.filter((err) => err.field !== fieldPath));
  };

  const handleNumericInputChange = (parent: string, field: string, value: string) => {
    const numericValue = parseNumericInput(value);
    handleNestedInputChange(parent, field, numericValue);
  };

  const handlePriceChange = (value: string) => {
    const numericValue = parseNumericInput(value);
    handleInputChange('price', numericValue);
  };

  const handlePhoneChange = (field: string, value: string) => {
    // Auto-format Chilean phone numbers
    const formatted = value.startsWith('+56') ? value : formatChileanPhone(value);
    handleNestedInputChange('contactInfo', field, formatted);
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities?.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...(prev.amenities || []), amenity],
    }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!formData.id) {
      setSnackbar({
        open: true,
        message: 'Primero debes crear la propiedad antes de subir imágenes.',
        severity: 'warning',
      });
      return;
    }

    const errors: string[] = [];
    const validFiles: File[] = [];

    // Validate all files first
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: no es una imagen válida`);
      } else if (file.size > 5 * 1024 * 1024) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        errors.push(`${file.name}: demasiado grande (${sizeMB}MB, máximo 5MB)`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors if any
    if (errors.length > 0) {
      setSnackbar({
        open: true,
        message: `Errores en ${errors.length} ${errors.length === 1 ? 'archivo' : 'archivos'}:\n${errors.join('\n')}`,
        severity: 'error',
        persistent: true,
      });

      // If no valid files, return early
      if (validFiles.length === 0) {
        return;
      }
    }

    // Upload only valid files
    if (validFiles.length > 0) {
      setUploadingImages(true);
      setUploadingCount(validFiles.length);

      try {
        const uploadPromises = validFiles.map(async (file) => {
          const result = await uploadImage.mutateAsync({
            propertyId: formData.id!,
            file,
            caption: `Imagen ${(formData.images?.length || 0) + 1}`,
          });
          return result;
        });

        const uploadedImages = await Promise.all(uploadPromises);

        setFormData((prev) => ({
          ...prev,
          images: [
            ...(prev.images || []),
            ...uploadedImages.map((img, index) => ({
              ...img,
              order: (prev.images?.length || 0) + index,
            })),
          ],
        }));

        setSnackbar({
          open: true,
          message: `${uploadedImages.length} ${uploadedImages.length === 1 ? 'imagen subida' : 'imágenes subidas'} correctamente`,
          severity: 'success',
        });
      } catch (err) {
        console.error('Error uploading images:', err);
        setSnackbar({
          open: true,
          message: `Error al subir imágenes: ${err instanceof Error ? err.message : 'Error desconocido'}`,
          severity: 'error',
          persistent: true,
        });
      } finally {
        setUploadingImages(false);
        setUploadingCount(0);
      }
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    console.log({ imageId, formData });
    try {
      if (formData.id) {
        // Delete from storage
        await deleteImage.mutateAsync({
          propertyId: formData.id,
          imageId,
        });

        // Update the Firestore document to remove the image from the array
        const updatedImages = formData.images?.filter((img) => img.id !== imageId) || [];
        await updateProperty.mutateAsync({
          id: formData.id,
          updates: { images: updatedImages },
        });
      }

      // Update local state
      setFormData((prev) => ({
        ...prev,
        images: prev.images?.filter((img) => img.id !== imageId) || [],
      }));

      setSnackbar({
        open: true,
        message: 'Imagen eliminada correctamente',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error deleting image:', err);
      setSnackbar({
        open: true,
        message: `Error al eliminar imagen: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        severity: 'error',
        persistent: true,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formData.images?.findIndex((img) => img.id === active.id) ?? -1;
      const newIndex = formData.images?.findIndex((img) => img.id === over.id) ?? -1;

      if (oldIndex !== -1 && newIndex !== -1 && formData.images) {
        const reorderedImages = arrayMove(formData.images, oldIndex, newIndex).map(
          (img, index) => ({
            ...img,
            order: index,
          }),
        );

        // Optimistically update UI
        setFormData((prev) => ({
          ...prev,
          images: reorderedImages,
        }));

        // Save to Firestore
        handleReorderImages(reorderedImages);
      }
    }
  };

  const handleReorderImages = async (reorderedImages: Property['images']) => {
    if (!formData.id) return;

    setIsReordering(true);
    setReorderError(null);

    try {
      await updateProperty.mutateAsync({
        id: formData.id,
        updates: { images: reorderedImages },
      });

      setSnackbar({
        open: true,
        message: 'Orden de imágenes actualizado',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error reordering images:', err);
      setReorderError(err instanceof Error ? err.message : 'Error al reordenar imágenes');
    } finally {
      setIsReordering(false);
    }
  };

  const handleRetryReorder = () => {
    if (formData.images) {
      handleReorderImages(formData.images);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validation = validateProperty(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setSnackbar({
        open: true,
        message: `Por favor corrige ${validation.errors.length} ${validation.errors.length === 1 ? 'error' : 'errores'} en el formulario`,
        severity: 'error',
      });
      return;
    }

    try {
      if (property?.id) {
        // Update existing property
        await updateProperty.mutateAsync({
          id: property.id,
          updates: formData,
        });
        setSnackbar({
          open: true,
          message: 'Propiedad actualizada correctamente',
          severity: 'success',
        });
        onSave({ ...property, ...formData } as Property);
      } else {
        // Create new property
        const id = await createProperty.mutateAsync(
          formData as Omit<Property, 'id' | 'createdAt' | 'updatedAt'>,
        );
        setSnackbar({
          open: true,
          message: 'Propiedad creada correctamente',
          severity: 'success',
        });
        onSave({ ...formData, id } as Property);
      }
    } catch (err) {
      console.error('Error saving property:', err);
      setSnackbar({
        open: true,
        message: `Error al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        severity: 'error',
        persistent: true,
      });
    }
  };

  return (
    <Box
      sx={{
        // height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Fixed Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: 1,
          boxShadow: 1,
        }}
      >
        <Typography variant="h5" gutterBottom>
          {property ? 'Editar Propiedad' : 'Nueva Propiedad'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message || 'Error al guardar la propiedad'}
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Por favor corrige los siguientes errores:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Box>

      {/* Scrollable Form Content */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
        }}
      >
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información Básica
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Título"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      error={hasFieldError(validationErrors, 'title')}
                      helperText={getFieldError(validationErrors, 'title')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descripción"
                      multiline
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      error={hasFieldError(validationErrors, 'description')}
                      helperText={getFieldError(validationErrors, 'description')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={hasFieldError(validationErrors, 'tipo')}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                      >
                        {types.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {hasFieldError(validationErrors, 'currency') && (
                        <FormHelperText>
                          {getFieldError(validationErrors, 'currency')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Precio"
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      error={hasFieldError(validationErrors, 'price')}
                      helperText={getFieldError(validationErrors, 'price')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={hasFieldError(validationErrors, 'currency')}>
                      <InputLabel>Moneda</InputLabel>
                      <Select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {hasFieldError(validationErrors, 'currency') && (
                        <FormHelperText>
                          {getFieldError(validationErrors, 'currency')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={hasFieldError(validationErrors, 'propertyType')}>
                      <InputLabel>Tipo de Propiedad</InputLabel>
                      <Select
                        value={formData.propertyType}
                        onChange={(e) => handleInputChange('propertyType', e.target.value)}
                      >
                        {propertyTypes.map((type) => (
                          <MenuItem key={type.value} value={type.value}>
                            {type.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {hasFieldError(validationErrors, 'propertyType') && (
                        <FormHelperText>
                          {getFieldError(validationErrors, 'propertyType')}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={hasFieldError(validationErrors, 'status')}>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        {statuses.map((status) => (
                          <MenuItem key={status.value} value={status.value}>
                            {status.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {hasFieldError(validationErrors, 'status') && (
                        <FormHelperText>{getFieldError(validationErrors, 'status')}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box display="flex" gap={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isActive}
                            onChange={(e) => handleInputChange('isActive', e.target.checked)}
                          />
                        }
                        label="Activa"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.isFeatured}
                            onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                          />
                        }
                        label="Destacada"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Address */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dirección
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Calle y Número"
                      value={formData.address?.street}
                      onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                      error={hasFieldError(validationErrors, 'address.street')}
                      helperText={getFieldError(validationErrors, 'address.street')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ciudad"
                      value={formData.address?.city}
                      onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                      error={hasFieldError(validationErrors, 'address.city')}
                      helperText={getFieldError(validationErrors, 'address.city')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Comuna"
                      value={formData.address?.commune}
                      onChange={(e) =>
                        handleNestedInputChange('address', 'commune', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'address.commune')}
                      helperText={getFieldError(validationErrors, 'address.commune')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Región"
                      value={formData.address?.region}
                      onChange={(e) => handleNestedInputChange('address', 'region', e.target.value)}
                      error={hasFieldError(validationErrors, 'address.region')}
                      helperText={getFieldError(validationErrors, 'address.region')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="País"
                      value={formData.address?.country}
                      onChange={(e) =>
                        handleNestedInputChange('address', 'country', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'address.country')}
                      helperText={getFieldError(validationErrors, 'address.country')}
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Features */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Características
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Dormitorios"
                      value={formData.features?.bedrooms}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'bedrooms', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.bedrooms')}
                      helperText={getFieldError(validationErrors, 'features.bedrooms')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Baños"
                      value={formData.features?.bathrooms}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'bathrooms', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.bathrooms')}
                      helperText={getFieldError(validationErrors, 'features.bathrooms')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Estacionamientos"
                      value={formData.features?.parkingSpaces}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'parkingSpaces', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.parkingSpaces')}
                      helperText={getFieldError(validationErrors, 'features.parkingSpaces')}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Superficie Total (m²)"
                      value={formData.features?.totalArea}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'totalArea', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.totalArea')}
                      helperText={getFieldError(validationErrors, 'features.totalArea')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Superficie Construida (m²)"
                      value={formData.features?.builtArea}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'builtArea', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.builtArea')}
                      helperText={getFieldError(validationErrors, 'features.builtArea')}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Año de Construcción"
                      value={formData.features?.yearBuilt ?? ''}
                      onChange={(e) =>
                        handleNumericInputChange('features', 'yearBuilt', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'features.yearBuilt')}
                      helperText={getFieldError(validationErrors, 'features.yearBuilt')}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Amenities */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Amenidades
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {commonAmenities.map((amenity) => (
                    <Chip
                      key={amenity}
                      label={amenity}
                      variant={formData.amenities?.includes(amenity) ? 'filled' : 'outlined'}
                      onClick={() => handleAmenityToggle(amenity)}
                      color={formData.amenities?.includes(amenity) ? 'primary' : 'default'}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información de Contacto
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Teléfono"
                      value={formData.contactInfo?.phone}
                      onChange={(e) => handlePhoneChange('phone', e.target.value)}
                      error={hasFieldError(validationErrors, 'contactInfo.phone')}
                      helperText={
                        getFieldError(validationErrors, 'contactInfo.phone') ||
                        'Formato: +56 9 XXXX XXXX'
                      }
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={formData.contactInfo?.email}
                      onChange={(e) =>
                        handleNestedInputChange('contactInfo', 'email', e.target.value)
                      }
                      error={hasFieldError(validationErrors, 'contactInfo.email')}
                      helperText={getFieldError(validationErrors, 'contactInfo.email')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="WhatsApp"
                      value={formData.contactInfo?.whatsapp}
                      onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                      error={hasFieldError(validationErrors, 'contactInfo.whatsapp')}
                      helperText={
                        getFieldError(validationErrors, 'contactInfo.whatsapp') ||
                        'Formato: +56 9 XXXX XXXX (opcional)'
                      }
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Images */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Imágenes
                </Typography>

                <Box mb={2}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                    multiple
                    type="file"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={!formData.id}
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={uploadingImages ? <CircularProgress size={20} /> : <CloudUpload />}
                      disabled={uploadingImages || uploadImage.isPending || !formData.id}
                    >
                      {uploadingImages
                        ? `Subiendo ${uploadingCount} ${uploadingCount === 1 ? 'imagen' : 'imágenes'}...`
                        : !formData.id
                          ? 'Guarda la propiedad antes de subir imágenes'
                          : 'Subir Imágenes'}
                    </Button>
                  </label>
                </Box>

                {/* Loading state */}
                {isReordering && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">Guardando nuevo orden...</Typography>
                    </Box>
                  </Alert>
                )}

                {/* Error state with retry */}
                {reorderError && (
                  <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={handleRetryReorder}>
                        Reintentar
                      </Button>
                    }
                  >
                    {reorderError}
                  </Alert>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={formData.images?.map((img) => img.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <Grid container spacing={2}>
                      {/* Skeleton loaders for uploading images */}
                      {uploadingImages &&
                        Array.from({ length: uploadingCount }).map((_, index) => (
                          <Grid item xs={12} md={4} key={`skeleton-${index}`}>
                            <Box
                              border={1}
                              borderColor="grey.300"
                              borderRadius={1}
                              overflow="hidden"
                            >
                              <Skeleton
                                variant="rectangular"
                                width="100%"
                                height={200}
                                animation="wave"
                              />
                              <Box p={1} bgcolor="rgba(255, 255, 255, 0.9)">
                                <Skeleton variant="text" width="60%" animation="wave" />
                              </Box>
                            </Box>
                          </Grid>
                        ))}

                      {/* Existing images */}
                      {formData.images && formData.images.length > 0 && (
                        <>
                          {formData.images.map((image, index) => (
                            <SortableImageItem
                              key={image.id}
                              image={image}
                              index={index}
                              onRemove={handleRemoveImage}
                              isDeleting={deleteImage.isPending}
                            />
                          ))}
                        </>
                      )}
                    </Grid>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Fixed Footer with Action Buttons */}
      <Box
        sx={{
          p: 3,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Box display="flex" gap={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            onClick={handleSubmit}
          >
            {isLoading ? 'Guardando...' : property ? 'Actualizar' : 'Crear'} Propiedad
          </Button>
        </Box>
      </Box>

      {/* Toast Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.persistent ? null : 6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', whiteSpace: 'pre-line' }}
          action={
            snackbar.persistent ? (
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              >
                <Close fontSize="small" />
              </IconButton>
            ) : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Sortable Image Item Component
interface SortableImageItemProps {
  image: Property['images'][0];
  index: number;
  onRemove: (imageId: string) => void;
  isDeleting: boolean;
}

const SortableImageItem = ({ image, index, onRemove, isDeleting }: SortableImageItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Grid item xs={12} md={4} ref={setNodeRef} style={style}>
      <Box
        position="relative"
        border={2}
        borderColor={isDragging ? 'primary.main' : 'grey.300'}
        borderRadius={1}
        overflow="hidden"
        sx={{
          cursor: isDragging ? 'grabbing' : 'grab',
          '&:hover .drag-handle': {
            opacity: 1,
          },
        }}
      >
        {/* Drag Handle */}
        <Box
          className="drag-handle"
          {...attributes}
          {...listeners}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 1,
            p: 0.5,
            cursor: 'grab',
            opacity: 0.7,
            transition: 'opacity 0.2s',
            zIndex: 1,
            '&:active': {
              cursor: 'grabbing',
            },
          }}
        >
          <DragIndicator fontSize="small" />
        </Box>

        <img
          src={image.url}
          alt={image.caption || `Imagen ${index + 1}`}
          style={{
            width: '100%',
            height: 200,
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />

        {/* Delete Button */}
        <IconButton
          onClick={() => onRemove(image.id)}
          disabled={isDeleting}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.9)',
            },
          }}
          size="small"
        >
          {isDeleting ? <CircularProgress size={16} /> : <Delete />}
        </IconButton>

        <Box p={1} bgcolor="rgba(255, 255, 255, 0.9)">
          <Typography variant="caption">{image.caption || `Imagen ${index + 1}`}</Typography>
        </Box>
      </Box>
    </Grid>
  );
};
