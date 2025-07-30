import { Routes } from 'react-router';

import Box from '@mui/material/Box';

import { Footer } from '@/components';

import routes from '..';
import { getPageHeight, renderRoutes } from './utils';

function Pages() {
  return (
    <Box sx={{ height: (theme) => getPageHeight(theme) }}>
      <Routes>{renderRoutes(routes)}</Routes>
      <Footer />
    </Box>
  );
}

export default Pages;
