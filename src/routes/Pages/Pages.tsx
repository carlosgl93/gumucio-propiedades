import { Routes } from 'react-router';

import Box from '@mui/material/Box';

import { Footer } from '@/components';

import routes from '..';
import { getPageHeight, renderRoutes } from './utils';

function Pages() {
  return (
    <Box sx={{ minHeight: (theme) => getPageHeight(theme) }}>
      <main>
        <Routes>{renderRoutes(routes)}</Routes>
      </main>
      <Footer />
    </Box>
  );
}

export default Pages;
