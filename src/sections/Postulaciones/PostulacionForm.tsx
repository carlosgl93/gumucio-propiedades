import { useState } from 'react';

import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useProperties } from '@/hooks/useProperties';
import { createApplication } from '@/services/application';
import { formatPrice } from '@/utils/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const PostulacionForm = ({ open, onClose }: Props) => {
  const qc = useQueryClient();
  const { data: properties = [] } = useProperties({ visibility: 'admin' });
  const [propertyId, setPropertyId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantRut, setApplicantRut] = useState('');

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const monthlyRent = selectedProperty?.price ?? 0;

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
          <Autocomplete
            options={properties}
            getOptionLabel={(option) =>
              `${option.title} (${option.address?.commune || 'Sin comuna'}) - ${formatPrice(option.price, option.currency)}`
            }
            value={selectedProperty || null}
            onChange={(_, newValue) => setPropertyId(newValue ? newValue.id : '')}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Propiedad"
                placeholder="Buscar por título, comuna o precio..."
                fullWidth
              />
            )}
            noOptionsText="No se encontraron propiedades"
          />
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
