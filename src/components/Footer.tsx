import { Box } from '@mui/material';

export const Footer = () => {
  return (
    <Box
      sx={{
        backgroundColor: '#fafafa',
        textAlign: 'center',
        position: 'relative',
        bottom: 0,
        width: '100%',
        p: 0,
        m: 0,
        overflow: 'hidden',
      }}
    >
      <img
        style={{
          objectFit: 'cover',
          width: '100%',
          display: 'block',
          margin: 0,
          padding: 0,
        }}
        src="/footer-logo.png"
        alt="Gumucio Propiedades"
      />
    </Box>
  );
};
