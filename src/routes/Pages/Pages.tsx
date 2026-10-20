import { Routes } from 'react-router';

import Box from '@mui/material/Box';

import { Footer } from '@/components';
import { usePageTracking } from '@/hooks/usePageTracking';

import routes from '..';
import { getPageHeight, renderRoutes } from './utils';

function Pages() {
  usePageTracking();

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
