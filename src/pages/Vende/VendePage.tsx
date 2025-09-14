import { Email, Phone, WhatsApp } from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';

import { email, phoneNumber, whatsappNumber } from '@/config';

import { SectionTitle } from '../Home/Home';

export const VendePage = () => {
  const handleWhatsApp = () => {
    const msg = 'Hola! Quiero vender mi propiedad con Gumucio Propiedades. ¿Podrían contactarme?';
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePhone = () => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleEmail = () => {
    const subject = 'Consulta para vender mi propiedad';
    const body =
      'Hola! Quiero vender mi propiedad con Gumucio Propiedades. ¿Podrían contactarme para más información?';
    window.open(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>VENDE TU PROPIEDAD</SectionTitle>

      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center" color="teal.main">
          ¿Quieres vender tu propiedad?
        </Typography>

        <Typography variant="h6" paragraph textAlign="center" color="text.secondary">
          En Gumucio Propiedades te ayudamos a vender tu propiedad de manera rápida y segura
        </Typography>

        <Box sx={{ my: 4 }}>
          <Typography variant="h6" gutterBottom>
            Nuestros servicios incluyen:
          </Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              Evaluación gratuita de tu propiedad
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Estrategia de marketing personalizada
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Fotografía profesional
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Publicación en múltiples plataformas
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Asesoría legal y financiera
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Acompañamiento durante todo el proceso
            </Typography>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom textAlign="center">
          Contáctanos para una evaluación gratuita
        </Typography>

        <Box
          display="flex"
          gap={2}
          justifyContent="center"
          flexDirection={{ xs: 'column', sm: 'row' }}
          mt={3}
        >
          <Button
            variant="contained"
            startIcon={<WhatsApp />}
            onClick={handleWhatsApp}
            sx={{
              bgcolor: '#25D366',
              '&:hover': { bgcolor: '#128C7E' },
              py: 1.5,
              px: 3,
            }}
          >
            WhatsApp
          </Button>
          <Button
            variant="contained"
            startIcon={<Phone />}
            onClick={handlePhone}
            sx={{
              bgcolor: 'teal.main',
              '&:hover': { bgcolor: 'teal.dark' },
              py: 1.5,
              px: 3,
            }}
          >
            Llamar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={handleEmail}
            sx={{
              borderColor: 'teal.main',
              color: 'teal.main',
              '&:hover': {
                borderColor: 'teal.dark',
                bgcolor: 'teal.50',
              },
              py: 1.5,
              px: 3,
            }}
          >
            Email
          </Button>
        </Box>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          ¿Por qué elegir Gumucio Propiedades?
        </Typography>
        <Typography variant="body1" paragraph>
          Con años de experiencia en el mercado inmobiliario, nos especializamos en brindar un
          servicio personalizado y profesional. Nuestro equipo te acompañará desde la primera
          consulta hasta el cierre de la venta, asegurando que obtengas el mejor precio por tu
          propiedad.
        </Typography>
        <Typography variant="body1">
          Contáctanos hoy mismo y descubre cómo podemos ayudarte a vender tu propiedad de forma
          exitosa.
        </Typography>
      </Paper>
    </Container>
  );
};

export default VendePage;
