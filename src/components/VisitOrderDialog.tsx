import { useState } from 'react';

import { Description } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

import { Property } from '@/models';
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
      await generateVisitOrderPDF(property, { visitorName: visitorName.trim() });
      // Reset form after successful generation
      setVisitorName('');
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
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
