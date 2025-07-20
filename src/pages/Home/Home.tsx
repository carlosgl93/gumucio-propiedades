import { useRef } from 'react';

import { Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { List } from '@/components/List';
import { whatsappNumber } from '@/config';
import { useAllProperties } from '@/hooks/useProperties';

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
  const { data: allProperties, isLoading } = useAllProperties();
  console.log('All properties:', allProperties);

  // Refs for scrolling
  const rentRef = useRef<HTMLDivElement>(null);
  const saleRef = useRef<HTMLDivElement>(null);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
        {/* <Logo>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'serif',
              fontWeight: 400,
              color: 'white',
              textAlign: 'center',
            }}
          >
            🏠
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Crimson Text", serif',
              fontWeight: 600,
              color: 'white',
              textAlign: 'center',
              mt: 1,
            }}
          >
            GUMUCIO
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"Crimson Text", serif',
              color: 'white',
              textAlign: 'center',
              letterSpacing: '0.2em',
            }}
          >
            PROPIEDADES
          </Typography>
        </Logo> */}

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
            onClick={() => scrollToRef(rentRef as React.RefObject<HTMLDivElement>)}
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

      {/* Recent Listings Section */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <div ref={rentRef}>
            <List
              title="Arriendos Disponibles"
              items={(allProperties || []).filter((p) => p.type === 'rent')}
            />
          </div>
          <div ref={saleRef}>
            <List
              title="Ventas Disponibles"
              items={(allProperties || [])?.filter((p) => p.type === 'sale')}
            />
          </div>
        </>
      )}
    </Box>
  );
}

export default Home;
