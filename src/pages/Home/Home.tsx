import { useNavigate } from 'react-router';

import { Box, Button, Card, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

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
            px: { xs: 2, sm: 4, md: 6 },
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            justifyContent: { xs: 'stretch', sm: 'center' },
            alignItems: 'center',
            gap: {
              xs: 2,
              sm: 3,
              md: 4,
            },
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/compra')}
          >
            COMPRA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/arrienda')}
          >
            ARRIENDA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/vende')}
          >
            VENDE
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '160px', md: '180px' },
              maxWidth: { sm: '200px', md: '220px' },
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 2.5, md: 3 },
            }}
            onClick={() => navigate('/arrienda-tu-propiedad')}
          >
            ARRIENDA TU PROPIEDAD
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 1, sm: 2, md: 3 },
              textAlign: 'center',
              lineHeight: 1.2,
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
