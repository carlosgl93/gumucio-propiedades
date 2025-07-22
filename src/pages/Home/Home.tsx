import { useNavigate } from 'react-router';

import { Box, Button, Card, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { whatsappNumber } from '@/config';

// Styled components
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundImage: 'url(/modern-house-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'start',
  paddingTop: theme.spacing(4),
  gap: theme.spacing(23),
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    padding: theme.spacing(4, 2),
    gap: theme.spacing(0),
  },
}));

const HeroContent = styled(Box)(({ theme }) => ({
  height: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'start',
  padding: theme.spacing(4, 6),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 1),
    alignItems: 'space-around',
    marginBottom: theme.spacing('65%'),
  },
}));

export const PropertyCard = styled(Card)(({ theme }) => ({
  maxWidth: 350,
  margin: 'auto',
  marginTop: theme.spacing(8),
  boxShadow: theme.shadows[3],
  '& .MuiCardMedia-root': {
    height: 200,
  },
}));

export const SectionTitle = styled(Typography)(() => ({
  fontFamily: '"Crimson Text", serif',
  fontSize: '2.5rem',
  fontWeight: 400,
  textAlign: 'center',
  marginBottom: '3rem',
  color: '#333',
  letterSpacing: '0.02em',
}));

const CallToAction = styled(Typography)(({ theme }) => ({
  fontFamily: '"Crimson Text", serif',
  fontSize: '2.8rem',
  fontWeight: 400,
  textAlign: 'center',
  color: '#303030',
  lineHeight: 1.2,
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  },
}));

//

function Home() {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    const msg = 'Hola! Quiero vender o arrendar mi propiedad con Gumucio Propiedades.';
    console.log('WhatsApp message:', msg);
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <Box>
      {/* Hero Section */}
      <HeroSection>
        <HeroContent>
          <Box
            sx={{
              backgroundColor: 'background.paper',
              padding: {
                xs: 2,
                sm: 4,
              },
              borderRadius: 2,
            }}
          >
            <CallToAction>¿QUIERES EMPEZAR UN CAPÍTULO NUEVO?</CallToAction>
          </Box>
        </HeroContent>

        <Box
          sx={{
            width: '100%',
            px: 8,
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            justifyContent: 'space-between',
            gap: {
              xs: 2,
              sm: 0,
            },
          }}
        >
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
            }}
            onClick={() => navigate('/propiedades')}
          >
            COMPRA O ARRIENDA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
            }}
            onClick={() => {
              handleWhatsApp();
            }}
          >
            VENDE O ARRIENDA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              p: 2,
            }}
          >
            RRSS {<br />} @GUMUCIOPROPIEDADES
          </Button>
        </Box>
      </HeroSection>
    </Box>
  );
}

export default Home;
