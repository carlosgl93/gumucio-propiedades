import React from 'react';
import { useNavigate } from 'react-router';

import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  Box,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';

import { Property } from '@/models';
import { PropertyCard, SectionTitle } from '@/pages/Home/Home';

type ListProps = {
  items: Property[];
  title: string;
};

export const List = ({ items, title }: ListProps) => {
  const navigate = useNavigate();
  const handleGoToPropertyDetails = (propertyId: string | undefined) => {
    // Navigate to property details page
    if (!propertyId) return;
    navigate(`/property/${propertyId}`);
  };

  // Responsive scroll amount and visible items per breakpoint
  // xs: 1, sm: 2, md: 3, lg: 4
  const getScrollAmount = () => {
    if (window.innerWidth < 600) return 320; // xs
    if (window.innerWidth < 900) return 340; // sm
    if (window.innerWidth < 1200) return 360; // md
    return 380; // lg
  };

  // Ref for scrolling
  const listRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (listRef.current) {
      listRef.current.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    }
  };
  const scrollRight = () => {
    if (listRef.current) {
      listRef.current.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    }
  };

  // Hide scrollbar CSS
  const hideScrollbar = {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>{title.toUpperCase()}</SectionTitle>
      <Divider sx={{ borderColor: '#000' }} />

      {items.length === 0 ? (
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
          No hay propiedades disponibles.
        </Typography>
      ) : (
        <Box sx={{ position: 'relative', mt: 4 }}>
          {/* Left Scroll Button */}
          <IconButton
            onClick={scrollLeft}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: 2,
              display: { xs: 'none', sm: 'flex' },
              '&:hover': { bgcolor: 'rgba(230,230,230,1)' },
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft />
          </IconButton>

          {/* Scrollable Flex List */}
          <Box
            ref={listRef}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 3,
              overflowX: 'auto',
              px: 6,
              height: '100%',
              ...hideScrollbar,
            }}
          >
            {items.map((property) => (
              <Box
                key={property.id}
                sx={{
                  minWidth: { xs: 280, sm: 320, md: 340, lg: 360 },
                  maxWidth: 380,
                  flex: '0 0 auto',
                  cursor: 'pointer',
                  height: '100%',
                  pb: 2,
                }}
                onClick={() => handleGoToPropertyDetails(property.id)}
              >
                <PropertyCard>
                  <CardMedia
                    component="img"
                    image={property.images?.[0]?.url}
                    alt={property.title}
                  />
                  <CardContent>
                    <Chip
                      label={property.status.toLocaleUpperCase()}
                      size="small"
                      sx={{
                        mb: 2,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: '"Crimson Text", serif',
                        fontWeight: 500,
                        mb: 2,
                      }}
                    >
                      {property.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}
                    >
                      {property.description}
                    </Typography>
                  </CardContent>
                </PropertyCard>
              </Box>
            ))}
          </Box>

          {/* Right Scroll Button */}
          <IconButton
            onClick={scrollRight}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: 2,
              display: { xs: 'none', sm: 'flex' },
              '&:hover': { bgcolor: 'rgba(230,230,230,1)' },
            }}
            aria-label="Scroll right"
          >
            <ChevronRight />
          </IconButton>
        </Box>
      )}
    </Container>
  );
};
