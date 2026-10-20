import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Bathtub, Bed, DirectionsCar, LocationOn, SquareFoot } from '@mui/icons-material';
import { Box, Card, CardContent, CardMedia, Chip, Skeleton, Typography } from '@mui/material';

import { Property } from '@/models';
import { formatChileanNumber, formatLocation, formatPrice } from '@/utils/formatters';

import { PropertyShareButtons } from '../PropertyShareButtons';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard = ({ property }: PropertyCardProps) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = () => {
    if (!property.id) return;
    navigate(`/property/${property.id}`);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s ease-in-out',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
        },
        '&:hover .share-button': {
          opacity: 1,
        },
      }}
      onClick={handleClick}
    >
      <Box sx={{ position: 'relative', height: 200 }}>
        {!imageLoaded && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height={200}
            animation="wave"
            sx={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}
        <CardMedia
          component="img"
          height="200"
          image={
            property.images?.[0]?.thumbnailUrl ||
            property.images?.[0]?.url ||
            '/placeholder-property.jpg'
          }
          alt={property.title || 'Propiedad sin título'}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          sx={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
        />
      </Box>

      <Box
        className="share-button"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          opacity: { xs: 1, sm: 0 },
          transition: 'opacity 0.2s',
        }}
      >
        <PropertyShareButtons property={property} variant="compact" />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          {property.status && (
            <Chip
              label={property.status.toUpperCase()}
              size="small"
              color={property.status === 'disponible' ? 'success' : 'default'}
              sx={{ fontSize: '0.7rem', fontWeight: 600 }}
            />
          )}
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
          {property.title || 'Sin título'}
        </Typography>

        {(property.address?.commune || property.address?.city) && (
          <Box display="flex" alignItems="center" mb={2} color="text.secondary">
            <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="body2" noWrap>
              {formatLocation(property.address?.commune, property.address?.city)}
            </Typography>
          </Box>
        )}

        {property.price > 0 && (
          <Typography variant="h5" color="teal.main" fontWeight="bold" mb={2}>
            {formatPrice(property.price, property.currency)}
          </Typography>
        )}

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
                {formatChileanNumber(property.features?.bathrooms)}
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
              {formatChileanNumber(property.features?.totalArea || 0)}m²
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
