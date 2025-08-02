import { useState } from 'react';

import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, IconButton, Paper } from '@mui/material';

import { PropertyImage } from '../models/property';

const ImagesCarousel = ({ images }: { images: PropertyImage[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <Paper elevation={0} sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Main Carousel */}
      <Box sx={{ position: 'relative', mb: 2 }}>
        {/* Main Image */}
        <Box sx={{ position: 'relative', height: 400, mx: 2 }}>
          <Paper
            elevation={3}
            sx={{
              height: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src={images[currentIndex].url}
              alt={images[currentIndex].caption}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Navigation Arrows */}
            <IconButton
              onClick={goToPrevious}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: '#92ad9e',
                color: '#f7f6f1',
                '&:hover': {
                  bgcolor: '#7a9286',
                },
                boxShadow: 3,
              }}
              aria-label="Previous image"
            >
              <ChevronLeft />
            </IconButton>

            <IconButton
              onClick={goToNext}
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: '#92ad9e',
                color: '#f7f6f1',
                '&:hover': {
                  bgcolor: '#7a9286',
                },
                boxShadow: 3,
              }}
              aria-label="Next image"
            >
              <ChevronRight />
            </IconButton>
          </Paper>
        </Box>

        {/* Thumbnail Navigation */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 2,
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
          {images.map((image, index) => (
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
              <Box
                component="img"
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Property Details */}
    </Paper>
  );
};

export default ImagesCarousel;
