import React from 'react';
import { useNavigate } from 'react-router';

import { Bathtub, Bed, DirectionsCar, LocationOn, SquareFoot } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';

import { whatsappNumber } from '@/config';
import { Property } from '@/models';

import { SectionTitle } from '../pages/Home/Home';

type ViewMode = 'cards' | 'list';

interface PropertyListViewProps {
  title: string;
  properties: Property[];
  isLoading?: boolean;
  showWhatsAppCTA?: boolean;
  ctaMessage?: string;
}

export const PropertyListView = ({
  title,
  properties,
  isLoading = false,
  showWhatsAppCTA = false,
  ctaMessage = 'Hola! Me interesa obtener más información sobre sus propiedades.',
}: PropertyListViewProps) => {
  const navigate = useNavigate();
  const viewMode: ViewMode = 'cards';
  //   const [viewMode, setViewMode] = useState<ViewMode>('cards');

  //   const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
  //     if (newMode !== null) {
  //       setViewMode(newMode);
  //     }
  //   };

  const handlePropertyClick = (propertyId: string | undefined) => {
    if (!propertyId) return;
    navigate(`/property/${propertyId}`);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(ctaMessage)}`;
    window.open(url, '_blank');
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'CLP') {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(price);
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <SectionTitle>{title}</SectionTitle>
        <Box display="flex" justifyContent="center">
          <Typography>Cargando propiedades...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>{title}</SectionTitle>
      <Divider sx={{ borderColor: '#000', mb: 4 }} />

      {/* View Mode Toggle */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h6" color="text.secondary">
          {properties.length}{' '}
          {properties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
        </Typography>
        {/* <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          size="small"
        >
          <ToggleButton value="cards" aria-label="card view">
            <ViewModule />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewList />
          </ToggleButton>
        </ToggleButtonGroup> */}
      </Box>

      {properties.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay propiedades disponibles
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Vuelve pronto para ver nuevas opciones.
          </Typography>
        </Box>
      ) : viewMode === 'cards' ? (
        <Grid container spacing={4}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => handlePropertyClick(property.id)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={property.images?.[0]?.url || '/placeholder-property.jpg'}
                  alt={property.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Chip
                      label={property.status.toUpperCase()}
                      size="small"
                      color={property.status === 'disponible' ? 'success' : 'default'}
                      sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                    />
                    {property.isFeatured && <Chip label="DESTACADO" size="small" color="warning" />}
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: '"Crimson Text", serif',
                      fontWeight: 500,
                      mb: 1,
                      fontSize: '1.1rem',
                    }}
                  >
                    {property.title}
                  </Typography>

                  <Box display="flex" alignItems="center" mb={2} color="text.secondary">
                    <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2" noWrap>
                      {property.address.commune}, {property.address.city}
                    </Typography>
                  </Box>

                  <Typography variant="h5" color="teal.main" fontWeight="bold" mb={2}>
                    {formatPrice(property.price, property.currency)}
                  </Typography>

                  <Box display="flex" gap={2} flexWrap="wrap">
                    {(property.features?.bedrooms || 0) > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Bed sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.features.bedrooms}
                        </Typography>
                      </Box>
                    )}
                    {(property.features?.bathrooms || 0) > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Bathtub sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.features.bathrooms}
                        </Typography>
                      </Box>
                    )}
                    {(property.features?.parkingSpaces || 0) > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <DirectionsCar sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {property.features.parkingSpaces}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <SquareFoot sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {property.features?.totalArea || 0}m²
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <List>
          {properties.map((property, index) => (
            <React.Fragment key={property.id}>
              <ListItem
                sx={{
                  py: 2,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: 'grey.50',
                  },
                }}
                onClick={() => handlePropertyClick(property.id)}
              >
                <Box
                  component="img"
                  src={property.images?.[0]?.url || '/placeholder-property.jpg'}
                  alt={property.title}
                  sx={{
                    width: 120,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mr: 2,
                  }}
                />
                <ListItemText
                  primary={
                    <Box>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Typography variant="h6" component="span">
                          {property.title}
                        </Typography>
                        <Typography variant="h6" color="teal.main" fontWeight="bold">
                          {formatPrice(property.price, property.currency)}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1} color="text.secondary">
                        <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="body2">
                          {property.address.commune}, {property.address.city}
                        </Typography>
                      </Box>
                      <Box display="flex" gap={2} alignItems="center" mb={1}>
                        <Chip
                          label={property.status.toUpperCase()}
                          size="small"
                          color={property.status === 'disponible' ? 'success' : 'default'}
                        />
                        {property.isFeatured && (
                          <Chip label="DESTACADO" size="small" color="warning" />
                        )}
                      </Box>
                      <Box display="flex" gap={2}>
                        {(property.features?.bedrooms || 0) > 0 && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Bed sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {property.features.bedrooms} dorm
                            </Typography>
                          </Box>
                        )}
                        {(property.features?.bathrooms || 0) > 0 && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Bathtub sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {property.features.bathrooms} baños
                            </Typography>
                          </Box>
                        )}
                        {(property.features?.parkingSpaces || 0) > 0 && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <DirectionsCar sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {property.features.parkingSpaces} est
                            </Typography>
                          </Box>
                        )}
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <SquareFoot sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {property.features?.totalArea || 0}m²
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < properties.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
      {/* WhatsApp CTA */}
      {showWhatsAppCTA && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            bgcolor: 'teal.50',
            borderLeft: 4,
            borderColor: 'teal.main',
          }}
        >
          <Typography variant="h6" gutterBottom>
            ¿No encuentras lo que buscas?
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={2}>
            Contáctanos por WhatsApp y te ayudaremos a encontrar la propiedad perfecta para ti.
          </Typography>
          <Button
            variant="contained"
            onClick={handleWhatsApp}
            sx={{
              bgcolor: 'teal.main',
              '&:hover': { bgcolor: 'teal.dark' },
            }}
          >
            Contactar por WhatsApp
          </Button>
        </Paper>
      )}
    </Container>
  );
};
