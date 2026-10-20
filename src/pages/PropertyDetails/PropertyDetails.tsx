import { JSX, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import {
  Bathtub,
  Bed,
  CheckCircle,
  DirectionsCar,
  Email,
  FitnessCenter,
  Phone,
  Pool,
  SquareFoot,
  WhatsApp,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';

import ImagesCarousel from '@/components/ImagesCarousel';
import Loading from '@/components/Loading';
import { PropertyShareButtons } from '@/components/PropertyShareButtons';
import { email, phoneNumber, whatsappNumber } from '@/config';
import { useProperty } from '@/hooks/useProperties';
import { trackContactClick, trackPropertyView } from '@/services/analytics';
import { formatChileanNumber, formatLocation, formatPrice } from '@/utils/formatters';

import { SectionTitle } from '../Home/Home';

// Helper function to get property type in Spanish
const getPropertyTypeLabel = (type: string) => {
  const types: { [key: string]: string } = {
    departamento: 'Departamento',
    casa: 'Casa',
    oficina: 'Oficina',
    local: 'Local Comercial',
  };
  return types[type] || type;
};

// Helper function to get status color and label
const getStatusInfo = (status: string) => {
  const statusMap: {
    [key: string]: { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' };
  } = {
    disponible: { label: 'Disponible', color: 'success' },
    vendido: { label: 'Vendido', color: 'default' },
    arrendado: { label: 'Arrendado', color: 'info' },
    reservado: { label: 'Reservado', color: 'warning' },
    no_disponible: { label: 'No disponible', color: 'error' },
  };
  return statusMap[status] || { label: status, color: 'default' };
};

// Amenity icons mapping
const getAmenityIcon = (amenity: string) => {
  const amenityIcons: { [key: string]: JSX.Element } = {
    Piscina: <Pool />,
    Gimnasio: <FitnessCenter />,
    Pool: <Pool />,
    Gym: <FitnessCenter />,
  };
  return amenityIcons[amenity] || <CheckCircle />;
};

export const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: property, isLoading, error } = useProperty(id || '');
  console.log({ property });

  const handleWhatsApp = () => {
    trackContactClick('whatsapp', {
      propertyId: property?.id,
      propertyTitle: property?.title,
      source: location.pathname,
      value: property?.price,
      currency: property?.currency,
    });
    const locationUrl = `${import.meta.env.VITE_PROD_URL}${location.pathname}`;
    const msg = `Hola! me interesa esta propiedad: ${property?.title || 'Sin título'} ${locationUrl}`;
    console.log('WhatsApp message:', msg);
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleClickPhonecall = () => {
    trackContactClick('phone', {
      propertyId: property?.id,
      propertyTitle: property?.title,
      source: location.pathname,
      value: property?.price,
      currency: property?.currency,
    });
    const phone = property?.contactInfo?.phone || phoneNumber;
    window.open(`tel:${phone}`);
  };

  const handleSendEmail = () => {
    trackContactClick('email', {
      propertyId: property?.id,
      propertyTitle: property?.title,
      source: location.pathname,
      value: property?.price,
      currency: property?.currency,
    });
    const locationText = formatLocation(property?.address?.commune, property?.address?.city);
    window.open(
      `mailto:${email}?subject=Consulta sobre propiedad: ${property?.title || 'Sin título'}&body=Hola, me interesa la propiedad: ${property?.address?.street || ''}${locationText ? `, ${locationText}` : ''}`,
    );
  };

  useEffect(() => {
    if (property) {
      trackPropertyView(property);
    }
  }, [property]);

  useEffect(() => {
    if (!id) {
      console.error('Property ID is required');
      navigate('/');
      return;
    }
  }, [id, navigate]);

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading property details</div>;
  if (!property) return <div>Property not found</div>;

  const statusInfo = getStatusInfo(property.status);
  const hasTitle = !!property.title?.trim();
  const hasAddress =
    !!property.address?.street?.trim() ||
    !!property.address?.commune?.trim() ||
    !!property.address?.city?.trim();
  const hasContactInfo = !!property.contactInfo?.phone || !!property.contactInfo?.email;
  const hasFeatures =
    !!property.features &&
    (property.features.totalArea > 0 ||
      (property.features.bedrooms ?? 0) > 0 ||
      (property.features.bathrooms ?? 0) > 0 ||
      (property.features.parkingSpaces ?? 0) > 0 ||
      (property.features.builtArea ?? 0) > 0 ||
      (property.features.yearBuilt ?? 0) > 0);
  const hasImages = property.images && property.images.length > 0;
  const hasDescription = !!property.description?.trim();
  const hasPrice = property.price > 0;
  const isIncomplete = !hasTitle && !hasDescription && !hasPrice;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {property.status === 'no_disponible' && (
        <Box sx={{ mb: 4, p: 3, bgcolor: 'error.light', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Propiedad no disponible
          </Typography>
          <Typography variant="body2">
            Esta propiedad no se encuentra disponible actualmente. Por favor vuelve más tarde o
            contáctanos para conocer otras opciones.
          </Typography>
        </Box>
      )}

      {isIncomplete && (
        <Box sx={{ mb: 4, p: 3, bgcolor: 'warning.light', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Propiedad no disponible
          </Typography>
          <Typography variant="body2">
            Esta propiedad no tiene información completa. Por favor contacta al administrador.
          </Typography>
        </Box>
      )}

      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        {hasTitle && <SectionTitle>{property.title.toUpperCase()}</SectionTitle>}

        {/* Property Tags */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            label={property.type === 'rent' ? 'Arriendo' : 'Venta'}
            sx={{
              bgcolor: 'teal.main',
              color: 'white',
              fontWeight: 500,
            }}
          />
          {property.propertyType && (
            <Chip
              label={getPropertyTypeLabel(property.propertyType)}
              variant="outlined"
              sx={{ bgcolor: 'grey.100' }}
            />
          )}
          <Chip label={statusInfo.label} color={statusInfo.color} variant="outlined" />
          {property.isFeatured && <Chip label="Destacado" color="warning" variant="outlined" />}
        </Box>
      </Box>

      {/* Images Carousel */}
      <Box sx={{ mb: 4 }}>
        {hasImages && <ImagesCarousel images={property.images} />}
        <Box sx={{ p: 2 }}>
          {hasPrice && (
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {formatPrice(property.price, property.currency)} {property.type === 'rent' && '/ mes'}
            </Typography>
          )}

          {/* <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, color: 'grey.600' }}>
            <LocationOn sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body1">
              {property.address.street}, {property.address.commune}, {property.address.city}
            </Typography>
          </Box> */}

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              sx={{
                bgcolor: 'teal.main',
                '&:hover': {
                  bgcolor: 'teal.dark',
                },
                fontWeight: 'bold',
                py: 1.5,
              }}
              onClick={handleWhatsApp}
              startIcon={<WhatsApp />}
            >
              CONTACTAR POR WHATSAPP
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#000', mb: 4 }} />

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column - Property Details */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          {hasDescription && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
                Descripción
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {property.description}
              </Typography>
            </Paper>
          )}

          {/* Features */}
          {hasFeatures && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
                Características
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      <Bed sx={{ fontSize: 32, color: 'teal.main' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {property.features.bedrooms}
                    </Typography>
                    <Typography variant="body2" color="grey.600">
                      Dormitorios
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      <Bathtub sx={{ fontSize: 32, color: 'teal.main' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatChileanNumber(property.features.bathrooms)}
                    </Typography>
                    <Typography variant="body2" color="grey.600">
                      Baños
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      <DirectionsCar sx={{ fontSize: 32, color: 'teal.main' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {property.features.parkingSpaces}
                    </Typography>
                    <Typography variant="body2" color="grey.600">
                      Estacionamientos
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                      <SquareFoot sx={{ fontSize: 32, color: 'teal.main' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatChileanNumber(property.features.totalArea)}m²
                    </Typography>
                    <Typography variant="body2" color="grey.600">
                      Área Total
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Additional Features */}
              {((property.features.builtArea ?? 0) > 0 ||
                (property.features.yearBuilt ?? 0) > 0) && (
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                  <Grid container spacing={2}>
                    {(property.features.builtArea ?? 0) > 0 && (
                      <Grid item xs={6}>
                        <Typography variant="body1">
                          <strong>Área Construida:</strong>{' '}
                          {formatChileanNumber(property.features.builtArea)}m²
                        </Typography>
                      </Grid>
                    )}
                    {(property.features.yearBuilt ?? 0) > 0 && (
                      <Grid item xs={6}>
                        <Typography variant="body1">
                          <strong>Año de Construcción:</strong> {property.features.yearBuilt}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Paper>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
                Amenidades
              </Typography>
              <List>
                {property.amenities.map((amenity, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'teal.main' }}>
                      {getAmenityIcon(amenity)}
                    </ListItemIcon>
                    <ListItemText primary={amenity} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
        {/* Right Column - Contact and Actions */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 20 }}>
            {hasContactInfo && (
              <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
                Información de Contacto
              </Typography>
            )}

            {/* Contact Info */}
            {hasContactInfo && (
              <Box sx={{ mb: 3 }} onClick={handleClickPhonecall}>
                {property.contactInfo.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Phone sx={{ mr: 1, color: 'teal.main' }} />
                    <Typography variant="body1">{property.contactInfo.phone}</Typography>
                  </Box>
                )}

                {property.contactInfo.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Email sx={{ mr: 1, color: 'teal.main' }} />
                    <Typography variant="body1">{property.contactInfo.email}</Typography>
                  </Box>
                )}

                {property.contactInfo.whatsapp && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WhatsApp sx={{ mr: 1, color: 'green' }} />
                    <Typography variant="body1">{property.contactInfo.whatsapp}</Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  bgcolor: 'teal.main',
                  '&:hover': {
                    bgcolor: 'teal.dark',
                  },
                  fontWeight: 'bold',
                  py: 1.5,
                }}
                onClick={handleWhatsApp}
                startIcon={<WhatsApp />}
              >
                CONTACTAR POR WHATSAPP
              </Button>

              <Button
                onClick={handleClickPhonecall}
                variant="outlined"
                size="large"
                fullWidth
                sx={{
                  borderColor: 'teal.main',
                  color: 'teal.main',
                  '&:hover': {
                    borderColor: 'teal.dark',
                    bgcolor: 'teal.50',
                  },
                  fontWeight: 'bold',
                  py: 1.5,
                }}
                startIcon={<Phone />}
              >
                LLAMAR AHORA
              </Button>

              <Button
                onClick={handleSendEmail}
                variant="outlined"
                size="large"
                fullWidth
                sx={{
                  borderColor: 'grey.400',
                  color: 'grey.700',
                  '&:hover': {
                    borderColor: 'grey.500',
                    bgcolor: 'grey.50',
                  },
                  fontWeight: 'bold',
                  py: 1.5,
                }}
                startIcon={<Email />}
              >
                ENVIAR EMAIL
              </Button>
            </Box>

            {/* Share Buttons */}
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <PropertyShareButtons property={property} variant="full" />
            </Box>

            {/* Property Summary */}
            {(hasPrice || property.propertyType) && (
              <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Resumen
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="grey.600">
                    Tipo:
                  </Typography>
                  <Typography variant="body2">
                    {getPropertyTypeLabel(property.propertyType)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="grey.600">
                    Estado:
                  </Typography>
                  <Typography variant="body2">{statusInfo.label}</Typography>
                </Box>
                {hasPrice && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="grey.600">
                      Precio:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatPrice(property.price, property.currency)}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {hasAddress && (
          <Box
            display={'flex'}
            flexDirection={'column'}
            justifyContent={'center'}
            sx={{ mx: 'auto' }}
          >
            <Typography variant="h5" component="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              Ubicación
            </Typography>
            <Box
              sx={{
                mb: 1,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 2,
                mx: 'auto',
              }}
            >
              <iframe
                title="Ubicación en Google Maps"
                width="100%"
                height="250"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  `${property.address.street}, ${property.address.commune}, ${property.address.city}, ${property.address.region}, ${property.address.country}`,
                )}&output=embed`}
              />
            </Box>
          </Box>
        )}
      </Grid>
    </Container>
  );
};

export default PropertyDetails;
