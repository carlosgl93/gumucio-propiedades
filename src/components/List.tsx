import { CardContent, CardMedia, Chip, Container, Divider, Grid, Typography } from '@mui/material';

import { Property } from '@/models';
import { PropertyCard, SectionTitle } from '@/pages/Home/Home';

type ListProps = {
  items: Property[];
  title: string;
};

export const List = ({ items, title }: ListProps) => {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>{title.toUpperCase()}</SectionTitle>
      <Divider
        sx={{
          borderColor: '#000',
        }}
      />

      {items.length === 0 ? (
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
          No hay propiedades disponibles.
        </Typography>
      ) : (
        <Grid container spacing={4} justifyContent="center">
          {items?.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <PropertyCard>
                <CardMedia component="img" image={property.images?.[0]?.url} alt={property.title} />
                <CardContent>
                  <Chip
                    label={property.status}
                    size="small"
                    sx={{
                      mb: 2,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: '#f5f5f5',
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
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};
