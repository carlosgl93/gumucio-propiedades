import { Email, Phone, WhatsApp } from '@mui/icons-material';
import { Box, Button, Container, Paper, Typography } from '@mui/material';

import { email, phoneNumber, whatsappNumber } from '@/config';

import { SectionTitle } from '../Home/Home';

export const ArriendaTuPropiedadPage = () => {
  const handleWhatsApp = () => {
    const msg = 'Hola! Quiero arrendar mi propiedad con Gumucio Propiedades. ¿Podrían contactarme?';
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePhone = () => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleEmail = () => {
    const subject = 'Consulta para arrendar mi propiedad';
    const body =
      'Hola! Quiero arrendar mi propiedad con Gumucio Propiedades. ¿Podrían contactarme para más información?';
    window.open(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <SectionTitle>ARRIENDA TU PROPIEDAD</SectionTitle>

      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="center" color="teal.main">
          ¿Quieres arrendar tu propiedad?
        </Typography>

        <Typography variant="h6" paragraph textAlign="center" color="text.secondary">
          En Gumucio Propiedades gestionamos tu propiedad para que genere ingresos constantes y
          seguros
        </Typography>

        <Box sx={{ my: 4 }}>
          <Typography variant="h6" gutterBottom>
            Nuestros servicios de administración incluyen:
          </Typography>
          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              Evaluación del precio de arriendo competitivo
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Búsqueda y selección de inquilinos confiables
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Control de antecedentes y referencias
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Elaboración de contratos de arriendo
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Cobro puntual de arriendos
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Mantenimiento y reparaciones coordinadas
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Inspecciones periódicas de la propiedad
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Resolución de conflictos con inquilinos
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
          Administración profesional de propiedades
        </Typography>
        <Typography variant="body1" paragraph>
          Nos encargamos de todos los aspectos de la administración de tu propiedad, desde encontrar
          inquilinos confiables hasta el cobro de arriendos y mantenimiento. Tú solo recibes tus
          ingresos puntualmente sin preocuparte por la gestión diaria.
        </Typography>
        <Typography variant="body1">
          Con nuestro servicio profesional, maximiza la rentabilidad de tu inversión inmobiliaria
          mientras nosotros nos encargamos de todo.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ArriendaTuPropiedadPage;
