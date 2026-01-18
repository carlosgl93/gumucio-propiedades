import { useState } from 'react';
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from 'react-share';

import { ContentCopy, Share } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';

import { Property } from '@/models';

// import { generateInstagramStoryImage } from '@/utils/generateInstagramImage';

interface PropertyShareButtonsProps {
  property: Property;
  variant?: 'full' | 'compact';
}

export const PropertyShareButtons = ({ property, variant = 'full' }: PropertyShareButtonsProps) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Generate shareable URL
  const propertyUrl = `${import.meta.env.VITE_PROD_URL}/property/${property.id}`;

  // Generate share text in Spanish
  const features: string[] = [];
  if (property.features.bedrooms) {
    features.push(`${property.features.bedrooms} dorm`);
  }
  if (property.features.bathrooms) {
    features.push(`${property.features.bathrooms} baños`);
  }
  if (property.features.totalArea) {
    features.push(`${property.features.totalArea}m²`);
  }

  const formatPrice = (price: number, currency: string): string => {
    if (currency === 'CLP') {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(price);
    }
    return `${currency} ${price.toLocaleString('es-CL')}`;
  };

  // WhatsApp-specific share text (includes image URL for better previews)
  const whatsappText = `${property.title}
${formatPrice(property.price, property.currency)}${property.type === 'rent' ? '/mes' : ''}
📍 ${property.address.commune}, ${property.address.city}
${features.join(' • ')}

Ver más: ${propertyUrl}
${property.images?.[0]?.url ? `\nImagen: ${property.images[0].url}` : ''}`;

  const shareText = `${property.title}
${formatPrice(property.price, property.currency)}${property.type === 'rent' ? '/mes' : ''}
📍 ${property.address.commune}, ${property.address.city}
${features.join(' • ')}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl);
      console.log('Link copied to clipboard:', propertyUrl);
      setSnackbarMessage('¡Enlace copiado! Pégalo en Instagram Stories');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setSnackbarMessage('Error al copiar el enlace');
      setSnackbarOpen(true);
    }
  };

  // const handleInstagramShare = async () => {
  //   setIsGeneratingImage(true);
  //   try {
  //     const imageBlob = await generateInstagramStoryImage(property);

  //     // Create download link
  //     const url = URL.createObjectURL(imageBlob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = `propiedad-${property.id}.jpg`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     URL.revokeObjectURL(url);

  //     setSnackbarMessage('Imagen descargada. Abre Instagram y súbela a tus historias');
  //     setSnackbarOpen(true);
  //   } catch (error) {
  //     console.error('Error generating Instagram image:', error);
  //     setSnackbarMessage('Error al generar la imagen para Instagram');
  //     setSnackbarOpen(true);
  //   } finally {
  //     setIsGeneratingImage(false);
  //   }
  // };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: propertyUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: open dialog with all options
      setDialogOpen(true);
    }
  };

  // Compact variant: Just a share icon button that opens dialog
  if (variant === 'compact') {
    return (
      <>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setDialogOpen(true);
          }}
          title="Compartir propiedad"
          size="small"
          sx={{
            bgcolor: 'white',
            '&:hover': {
              bgcolor: 'grey.100',
            },
          }}
        >
          <Share />
        </IconButton>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Compartir propiedad</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {/* WhatsApp */}
              <Box display="flex" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                <WhatsappShareButton url={propertyUrl} title={whatsappText} separator="">
                  <Box display="flex" alignItems="center" gap={1}>
                    <WhatsappIcon size={40} round />
                    <Typography>WhatsApp</Typography>
                  </Box>
                </WhatsappShareButton>
              </Box>

              {/* Facebook */}
              <Box display="flex" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                <FacebookShareButton url={propertyUrl} hashtag="#propiedades">
                  <Box display="flex" alignItems="center" gap={1}>
                    <FacebookIcon size={40} round />
                    <Typography>Facebook</Typography>
                  </Box>
                </FacebookShareButton>
              </Box>

              {/* Twitter/X */}
              <Box display="flex" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                <TwitterShareButton url={propertyUrl} title={shareText}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TwitterIcon size={40} round />
                    <Typography>Twitter / X</Typography>
                  </Box>
                </TwitterShareButton>
              </Box>

              {/* LinkedIn */}
              <Box display="flex" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                <LinkedinShareButton url={propertyUrl} title={property.title} summary={shareText}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinkedinIcon size={40} round />
                    <Typography>LinkedIn</Typography>
                  </Box>
                </LinkedinShareButton>
              </Box>

              {/* Instagram */}
              {/* <Button
                variant="outlined"
                startIcon={isGeneratingImage ? <CircularProgress size={20} /> : <Instagram />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstagramShare();
                }}
                disabled={isGeneratingImage}
                sx={{
                  borderColor: '#E1306C',
                  color: '#E1306C',
                  '&:hover': {
                    borderColor: '#C13584',
                    bgcolor: 'rgba(193, 53, 132, 0.04)',
                  },
                }}
              >
                {isGeneratingImage ? 'Generando...' : 'Instagram Stories'}
              </Button> */}

              {/* Copy Link */}
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                sx={{
                  borderColor: 'grey.400',
                  color: 'white',
                }}
              >
                Copiar Enlace
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </>
    );
  }

  // Full variant: Show all buttons inline (for PropertyDetails)
  return (
    <Box>
      {/* Mobile: Native share button */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 2 }}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          startIcon={<Share />}
          onClick={handleNativeShare}
          sx={{
            color: 'white',
            borderColor: 'white',
            '&:hover': {
              borderColor: 'teal.dark',
              bgcolor: 'teal.50',
            },
            fontWeight: 'bold',
            py: 1.5,
          }}
        >
          Compartir
        </Button>
      </Box>

      {/* Desktop: All buttons visible */}
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'grey.600' }}>
          Compartir en redes sociales:
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          {/* WhatsApp */}
          <WhatsappShareButton url={propertyUrl} title={shareText}>
            <WhatsappIcon size={40} round />
          </WhatsappShareButton>

          {/* Facebook */}
          <FacebookShareButton url={propertyUrl} hashtag="#propiedades">
            <FacebookIcon size={40} round />
          </FacebookShareButton>

          {/* Twitter/X */}
          <TwitterShareButton url={propertyUrl} title={shareText}>
            <TwitterIcon size={40} round />
          </TwitterShareButton>

          {/* LinkedIn */}
          <LinkedinShareButton url={propertyUrl} title={property.title} summary={shareText}>
            <LinkedinIcon size={40} round />
          </LinkedinShareButton>

          {/* Instagram */}
          {/* <IconButton
            onClick={handleInstagramShare}
            disabled={isGeneratingImage}
            sx={{
              bgcolor: '#E1306C',
              color: 'white',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: '#C13584',
              },
              '&:disabled': {
                bgcolor: 'grey.300',
              },
            }}
            title="Instagram Stories"
          >
            {isGeneratingImage ? <CircularProgress size={20} color="inherit" /> : <Instagram />}
          </IconButton> */}

          {/* Copy Link */}
          <IconButton
            onClick={handleCopyLink}
            sx={{
              bgcolor: 'grey.200',
              color: 'grey.700',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: 'grey.300',
              },
            }}
            title="Copiar enlace"
          >
            <ContentCopy />
          </IconButton>
        </Stack>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
