import { useEffect, useState } from 'react';

import { Description } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { Property } from '@/models';
import { getUfValue } from '@/utils/currencyConverter';
import { generateVisitOrderPDF } from '@/utils/visitOrderPdf';

interface VisitOrderDialogProps {
  open: boolean;
  property: Property | null;
  onClose: () => void;
}

export const VisitOrderDialog = ({ open, property, onClose }: VisitOrderDialogProps) => {
  const [visitorName, setVisitorName] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ufUnavailable, setUfUnavailable] = useState(false);
  const [manualUf, setManualUf] = useState('');
  const [ignoreUf, setIgnoreUf] = useState(false);

  useEffect(() => {
    if (!open || !property) return;
    setVisitorName('');
    setError('');
    setManualUf('');
    setIgnoreUf(false);

    // Check UF availability if property price is in CLP or UF
    getUfValue().then((rate) => {
      setUfUnavailable(rate === null);
    });
  }, [open, property]);

  const validateForm = (): boolean => {
    if (!visitorName.trim()) {
      setError('El nombre del visitante es requerido');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !property) return;

    setIsGenerating(true);
    try {
      let customUfValue: number | null | undefined = undefined;
      if (ignoreUf) {
        customUfValue = null;
      } else if (manualUf && parseFloat(manualUf) > 0) {
        customUfValue = parseFloat(manualUf);
      }

      await generateVisitOrderPDF(property, { visitorName: visitorName.trim() }, { customUfValue });
      setVisitorName('');
      onClose();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Error al generar el PDF. Por favor intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setVisitorName('');
      setError('');
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isGenerating) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generar Orden de Visita</DialogTitle>
      <DialogContent>
        {property && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <strong>Propiedad:</strong> {property.title}
            <br />
            <strong>Dirección:</strong> {property.address?.street || 'N/A'},{' '}
            {property.address?.commune || 'N/A'}
          </Box>
        )}

        <TextField
          fullWidth
          label="Nombre del visitante"
          value={visitorName}
          onChange={(e) => {
            setVisitorName(e.target.value);
            if (error) setError('');
          }}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error || 'Ingrese el nombre completo del visitante'}
          margin="normal"
          required
          autoFocus
          disabled={isGenerating}
          placeholder="Ej: Juan Pérez González"
        />

        {ufUnavailable && !ignoreUf && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              No se pudo obtener el valor actual de la UF automáticamente.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Puede ingresar el valor actual de la UF en CLP o ignorar la conversión para emitir el
              PDF solo con el precio original de la propiedad.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label="Valor UF (CLP)"
                type="number"
                placeholder="Ej: 38500"
                value={manualUf}
                onChange={(e) => setManualUf(e.target.value)}
                sx={{ bgcolor: 'background.paper', width: 180 }}
              />
              <Button size="small" variant="outlined" onClick={() => setIgnoreUf(true)}>
                Ignorar UF
              </Button>
            </Stack>
          </Alert>
        )}

        {ignoreUf && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => setIgnoreUf(false)}>
                Ingresar UF
              </Button>
            }
          >
            Se generará el PDF con el precio original sin conversión a UF.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isGenerating}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isGenerating || !visitorName.trim()}
          startIcon={<Description />}
        >
          {isGenerating ? 'Generando...' : 'Generar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
