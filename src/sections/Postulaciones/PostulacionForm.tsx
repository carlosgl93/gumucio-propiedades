import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createApplication } from '@/services/application';
import { propertyService } from '@/services/property';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const PostulacionForm = ({ open, onClose }: Props) => {
  const qc = useQueryClient();
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getAllProperties({ isActive: true }),
  });
  const [propertyId, setPropertyId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantRut, setApplicantRut] = useState('');

  const monthlyRent = properties?.find((p) => p.id === propertyId)?.price ?? 0;

  const create = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postulaciones'] });
      onClose();
      setPropertyId('');
      setApplicantName('');
      setApplicantRut('');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva postulación</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Propiedad"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            fullWidth
          >
            {properties?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Renta objetivo (CLP)"
            value={monthlyRent}
            disabled
            fullWidth
            helperText="Auto-calculado desde el precio de la propiedad"
          />
          <TextField
            label="Nombre del postulante"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            fullWidth
            name="applicantName"
          />
          <TextField
            label="RUT del postulante"
            value={applicantRut}
            onChange={(e) => setApplicantRut(e.target.value)}
            fullWidth
            placeholder="12.345.678-5"
            name="applicantRut"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!propertyId || !applicantName || !applicantRut}
          onClick={() =>
            create.mutate({
              propertyId,
              applicantName,
              applicantRut,
              monthlyRent,
            })
          }
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
};
