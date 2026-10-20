import { useState } from 'react';

import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, IconButton, Paper, Typography } from '@mui/material';

import { PropertyImage } from '../models/property';

const ImagesCarousel = ({ images }: { images?: PropertyImage[] | null }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeImages = images ?? [];

  if (safeImages.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          maxWidth: 800,
          mx: 'auto',
          height: { xs: 260, sm: 400 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Sin imágenes disponibles
        </Typography>
      </Paper>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? safeImages.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === safeImages.length - 1 ? 0 : prevIndex + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentImage = safeImages[currentIndex];

  return (
    <Paper elevation={0} sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Main Carousel */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Main Image */}
        <Box sx={{ position: 'relative', height: { xs: 260, sm: 400 }, mx: { xs: 0, sm: 2 } }}>
          <Paper
            elevation={3}
            sx={{
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              bgcolor: { xs: 'grey.900', sm: 'transparent' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentImage?.url ? (
              <Box
                component="img"
                src={currentImage.url}
                alt={currentImage.caption || 'Imagen de la propiedad'}
                decoding="async"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: { xs: 'contain', sm: 'cover' },
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.200',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Imagen no disponible
                </Typography>
              </Box>
            )}

            {/* Navigation Arrows */}
            {safeImages.length > 1 && (
              <>
                <IconButton
                  onClick={goToPrevious}
                  sx={{
                    position: 'absolute',
                    left: { xs: 8, sm: 16 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: '#92ad9e',
                    color: '#f7f6f1',
                    p: { xs: 0.75, sm: 1 },
                    '&:hover': {
                      bgcolor: '#7a9286',
                    },
                    boxShadow: 3,
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                </IconButton>

                <IconButton
                  onClick={goToNext}
                  sx={{
                    position: 'absolute',
                    right: { xs: 8, sm: 16 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: '#92ad9e',
                    color: '#f7f6f1',
                    p: { xs: 0.75, sm: 1 },
                    '&:hover': {
                      bgcolor: '#7a9286',
                    },
                    boxShadow: 3,
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                </IconButton>
              </>
            )}
          </Paper>
        </Box>

        {/* Thumbnail Navigation */}
        {safeImages.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              p: { xs: 1, sm: 2 },
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'grey.400',
                borderRadius: 3,
              },
            }}
          >
            {safeImages.map((image, index) => (
              <Paper
                key={image.id}
                elevation={index === currentIndex ? 3 : 1}
                sx={{
                  flexShrink: 0,
                  width: 80,
                  height: 64,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: index === currentIndex ? 2 : 1,
                  borderColor: index === currentIndex ? 'teal.main' : 'grey.300',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'grey.400',
                  },
                }}
                onClick={() => goToSlide(index)}
              >
                {image.url ? (
                  <Box
                    component="img"
                    src={image.thumbnailUrl || image.url}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: 'grey.200',
                    }}
                  />
                )}
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ImagesCarousel;
