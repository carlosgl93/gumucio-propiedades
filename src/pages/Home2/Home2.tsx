// components/HomePage.tsx
import { useEffect, useState } from 'react';

import {
  Bathtub,
  Bed,
  DirectionsCar,
  Email,
  LocationOn,
  Phone,
  Search,
  SquareFoot,
  WhatsApp,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';

import { Property } from '@/models';
import { propertyService } from '@/services/property';

export const Home2 = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    city: '',
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const [allProps, featured] = await Promise.all([
        propertyService.getAvailableProperties(),
        propertyService.getFeaturedProperties(),
      ]);
      setProperties(allProps);
      setFeaturedProperties(featured);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  // const formatPrice = (price: number, currency: string) => {
  //   const formatter = new Intl.NumberFormat('es-CL');
  //   return `${formatter.format(price)} ${currency}`;
  // };

  // const getWhatsAppUrl = (phone: string, propertyTitle: string) => {
  //   const message = `Hola! Me interesa la propiedad: ${propertyTitle}`;
  //   const cleanPhone = phone.replace(/\D/g, '');
  //   return `https://wa.me/56${cleanPhone}?text=${encodeURIComponent(message)}`;
  // };

  const filteredProperties = properties.filter((property) => {
    const matchesType = !filters.propertyType || property.propertyType === filters.propertyType;
    const matchesMinPrice = !filters.minPrice || property.price >= Number(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || property.price <= Number(filters.maxPrice);
    const matchesCity =
      !filters.city || property.address.city.toLowerCase().includes(filters.city.toLowerCase());

    return matchesType && matchesMinPrice && matchesMaxPrice && matchesCity;
  });

  return (
    <Box>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gumucio Propiedades
          </Typography>
          <Typography variant="body2">Rancagua, Chile</Typography>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.dark',
          color: 'white',
          py: 8,
          backgroundImage: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom textAlign="center">
            Encuentra tu hogar ideal
          </Typography>
          <Typography variant="h5" textAlign="center" sx={{ mb: 4, opacity: 0.9 }}>
            Propiedades de calidad en Rancagua y sus alrededores
          </Typography>

          {/* Search Filters */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Propiedad</InputLabel>
                  <Select
                    value={filters.propertyType}
                    onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="casa">Casa</MenuItem>
                    <MenuItem value="departamento">Departamento</MenuItem>
                    <MenuItem value="oficina">Oficina</MenuItem>
                    <MenuItem value="terreno">Terreno</MenuItem>
                    <MenuItem value="comercial">Comercial</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Precio Mín."
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Precio Máx."
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<Search />}
                  onClick={loadProperties}
                >
                  Buscar
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Featured Properties */}
        {featuredProperties.length > 0 && (
          <Box mb={6}>
            <Typography variant="h4" component="h2" gutterBottom textAlign="center">
              Propiedades Destacadas
            </Typography>
            <Grid container spacing={3}>
              {featuredProperties.slice(0, 3).map((property) => (
                <Grid item xs={12} md={4} key={property.id}>
                  <PropertyCard property={property} featured />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* All Properties */}
        <Box>
          <Typography variant="h4" component="h2" gutterBottom>
            Todas las Propiedades
            <Chip label={`${filteredProperties.length} resultados`} sx={{ ml: 2 }} />
          </Typography>

          {loading ? (
            <Typography>Cargando propiedades...</Typography>
          ) : filteredProperties.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No se encontraron propiedades que coincidan con los filtros.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {filteredProperties.map((property) => (
                <Grid item xs={12} sm={6} md={4} key={property.id}>
                  <PropertyCard property={property} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 4, mt: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Gumucio Propiedades
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Tu agente inmobiliario de confianza en Rancagua. Más de 10 años ayudando a familias
                a encontrar su hogar ideal.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Contacto
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Phone fontSize="small" />
                <Typography variant="body2">+56 9 1234 5678</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Email fontSize="small" />
                <Typography variant="body2">contacto@gumucioprops.cl</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOn fontSize="small" />
                <Typography variant="body2">Rancagua, Chile</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box textAlign="center" mt={3} pt={3} borderTop={1} borderColor="grey.700">
            <Typography variant="body2" color="grey.400">
              © 2025 Gumucio Propiedades. Todos los derechos reservados.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

// components/PropertyCard.tsx
interface PropertyCardProps {
  property: Property;
  featured?: boolean;
}

const PropertyCard = ({ property, featured = false }: PropertyCardProps) => {
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-CL');
    return `${formatter.format(price)} ${currency}`;
  };

  const getWhatsAppUrl = (phone: string, propertyTitle: string) => {
    const message = `Hola! Me interesa la propiedad: ${propertyTitle}`;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/56${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const primaryImage = property.images?.[0];

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: featured ? 4 : 1,
        border: featured ? 2 : 0,
        borderColor: featured ? 'primary.main' : 'transparent',
      }}
    >
      {featured && (
        <Chip
          label="Destacada"
          color="primary"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
          }}
        />
      )}

      {primaryImage ? (
        <CardMedia
          component="img"
          height="240"
          image={primaryImage.url}
          alt={property.title}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 240,
            bgcolor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary">Sin imagen</Typography>
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          {property.title}
        </Typography>

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocationOn fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {property.address.city}, {property.address.commune}
          </Typography>
        </Box>

        <Typography variant="h5" color="primary" gutterBottom>
          {formatPrice(property.price, property.currency)}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {property.description.length > 100
            ? `${property.description.substring(0, 100)}...`
            : property.description}
        </Typography>

        {/* Property Features */}
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          {property.features.bedrooms && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Bed fontSize="small" color="action" />
              <Typography variant="caption">{property.features.bedrooms} dorm.</Typography>
            </Box>
          )}
          {property.features.bathrooms && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Bathtub fontSize="small" color="action" />
              <Typography variant="caption">{property.features.bathrooms} baños</Typography>
            </Box>
          )}
          {property.features.parkingSpaces && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <DirectionsCar fontSize="small" color="action" />
              <Typography variant="caption">{property.features.parkingSpaces} est.</Typography>
            </Box>
          )}
          {property.features.totalArea && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <SquareFoot fontSize="small" color="action" />
              <Typography variant="caption">{property.features.totalArea} m²</Typography>
            </Box>
          )}
        </Box>

        <Chip
          label={property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
          size="small"
          variant="outlined"
        />
      </CardContent>

      <CardActions sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<WhatsApp />}
          href={getWhatsAppUrl(property.contactInfo.phone, property.title)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
        >
          Consultar por WhatsApp
        </Button>
      </CardActions>
    </Card>
  );
};

export default Home2;
