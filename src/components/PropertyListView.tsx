import { useEffect, useRef } from 'react';

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

import { whatsappNumber } from '@/config';
import { useInfiniteProperties, usePropertiesCount } from '@/hooks/useProperties';
import { trackContactClick } from '@/services/analytics';

import { SectionTitle } from '../pages/Home/Home';
import { PropertyCard } from './PropertyCard';

interface PropertyListViewProps {
  title: string;
  type: 'rent' | 'sale';
  showWhatsAppCTA?: boolean;
  ctaMessage?: string;
}

export const PropertyListView = ({
  title,
  type,
  showWhatsAppCTA = false,
  ctaMessage = 'Hola! Me interesa obtener más información sobre sus propiedades.',
}: PropertyListViewProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'));
  const pageSize = isMobile ? 2 : 6;

  const { properties, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteProperties(type, pageSize);
  const { data: totalCount } = usePropertiesCount(type);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleWhatsApp = () => {
    trackContactClick('whatsapp', { source: `property_list_${type}` });
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(ctaMessage)}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <SectionTitle>{title}</SectionTitle>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>{title}</SectionTitle>
      <Divider sx={{ borderColor: '#000', mb: 4 }} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h6" color="text.secondary">
          {totalCount ?? properties.length}{' '}
          {(totalCount ?? properties.length) === 1
            ? 'propiedad encontrada'
            : 'propiedades encontradas'}
        </Typography>
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
      ) : (
        <Grid container spacing={4}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard property={property} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Infinite scroll sentinel */}
      <Box ref={sentinelRef} sx={{ height: 1 }} />

      {isFetchingNextPage && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!hasNextPage && properties.length > 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            Has visto todas las propiedades disponibles.
          </Typography>
        </Box>
      )}

      {showWhatsAppCTA && (
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mt: 4,
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
