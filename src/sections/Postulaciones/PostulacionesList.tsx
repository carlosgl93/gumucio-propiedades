import { useState } from 'react';

import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

import { useQuery } from '@tanstack/react-query';

import type { Postulacion } from '@/models/application';
import { listApplications } from '@/services/application';

import { PostulacionDetail } from './PostulacionDetail';
import { PostulacionForm } from './PostulacionForm';

interface Props {
  uploadedBy: string;
}

export const PostulacionesList = ({ uploadedBy }: Props) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Postulacion | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['postulaciones'],
    queryFn: listApplications,
  });

  if (selected) {
    return (
      <PostulacionDetail
        postulacion={selected}
        uploadedBy={uploadedBy}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (isLoading) return <CircularProgress />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Postulaciones</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Nueva postulación
        </Button>
      </Stack>
      {data?.length === 0 && (
        <Typography color="text.secondary">No hay postulaciones todavía.</Typography>
      )}
      {data?.map((p) => (
        <Box
          key={p.id}
          sx={{
            p: 2,
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            cursor: 'pointer',
          }}
          onClick={() => setSelected(p)}
        >
          <Typography>
            {p.applicantName} ({p.applicantRut}) — propiedad {p.propertyId} —{' '}
            <strong>{p.status}</strong>
          </Typography>
        </Box>
      ))}
      <PostulacionForm open={open} onClose={() => setOpen(false)} />
    </Box>
  );
};
