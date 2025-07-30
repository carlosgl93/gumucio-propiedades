import { Box, useMediaQuery } from '@mui/material';

import { List } from '@/components/List';
import Loading from '@/components/Loading';
import { useAllProperties } from '@/hooks/useProperties';

function Propiedades() {
  const { data: allProperties, isLoading } = useAllProperties();
  const isMobile = useMediaQuery('(max-width:600px)');

  if (isLoading) <Loading />;

  return (
    <>
      <meta
        name="Propiedades publicadas en Gumucio Propiedades"
        content="Descubre las mejores propiedades en venta y arriendo en Santiago, Chile."
      />
      <Box sx={{ padding: isMobile ? 2 : 4 }}>
        <List
          title="Ventas Disponibles"
          items={(allProperties || [])?.filter((p) => p.type === 'sale')}
        />
        <List
          title="Arriendos Disponibles"
          items={(allProperties || []).filter((p) => p.type === 'rent')}
        />
      </Box>
    </>
  );
}

export default Propiedades;
