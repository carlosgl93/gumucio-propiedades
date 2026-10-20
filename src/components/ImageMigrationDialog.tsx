import { useMemo, useState } from 'react';

import { AutoFixHigh, CheckCircle, WarningAmber } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

import { Property, PropertyImage } from '@/models';
import { propertyService } from '@/services/property';

interface ImageMigrationDialogProps {
  open: boolean;
  onClose: () => void;
  properties: Property[];
  onSuccess: () => void;
}

const isLegacyImage = (img: PropertyImage): boolean => {
  return !img.thumbnailUrl || !img.url.includes('.webp');
};

export const ImageMigrationDialog = ({
  open,
  onClose,
  properties,
  onSuccess,
}: ImageMigrationDialogProps) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identify properties requiring migration
  const pendingProperties = useMemo(() => {
    return properties.filter((p) => p.images && p.images.some(isLegacyImage));
  }, [properties]);

  const totalLegacyImages = useMemo(() => {
    return pendingProperties.reduce((acc, p) => {
      const legacyCount = p.images?.filter(isLegacyImage).length || 0;
      return acc + legacyCount;
    }, 0);
  }, [pendingProperties]);

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setProgress(0);
    setError(null);
    setLogs([]);
    setCompleted(false);

    try {
      const total = pendingProperties.length;

      for (let i = 0; i < total; i++) {
        const prop = pendingProperties[i];
        if (!prop.id || !prop.images || prop.images.length === 0) continue;

        setCurrentStep(`Optimizando (${i + 1}/${total}): ${prop.title || 'Propiedad sin título'}`);

        const updatedImages = await propertyService.optimizePropertyImages(prop.id, prop.images);

        await propertyService.updateProperty(prop.id, {
          images: updatedImages,
        });

        const legacyOptimized = prop.images.filter(isLegacyImage).length;
        setLogs((prev) => [
          ...prev,
          `"${prop.title || prop.id}": ${legacyOptimized} imagen(es) convertidas a WebP y miniaturas generadas.`,
        ]);

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setCompleted(true);
      setCurrentStep('Migración finalizada con éxito.');
      onSuccess();
    } catch (err) {
      console.error('Error during image migration:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido durante la migración');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClose = () => {
    if (isMigrating) return;
    setIsMigrating(false);
    setProgress(0);
    setCurrentStep('');
    setLogs([]);
    setCompleted(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoFixHigh color="primary" />
        Migración de imágenes a WebP
      </DialogTitle>

      <DialogContent dividers>
        {!isMigrating && !completed && (
          <Box mb={2}>
            {pendingProperties.length > 0 ? (
              <>
                <Alert severity="info" icon={<WarningAmber />} sx={{ mb: 2 }}>
                  Se encontraron <strong>{pendingProperties.length}</strong> propiedades con un
                  total de <strong>{totalLegacyImages}</strong> imágenes en formatos anteriores
                  (JPG/PNG o sin miniatura).
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Este proceso convertirá cada imagen al formato moderno WebP y generará
                  automáticamente su versión en miniatura. Las imágenes existentes en la web se
                  actualizarán sin interrumpir el servicio.
                </Typography>
              </>
            ) : (
              <Alert severity="success" icon={<CheckCircle />}>
                Todas las propiedades actuales ya cuentan con imágenes optimizadas en formato WebP y
                miniaturas generadas.
              </Alert>
            )}
          </Box>
        )}

        {(isMigrating || completed) && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight={500}>
                {currentStep}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={completed ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {logs.length > 0 && (
          <Box
            sx={{
              maxHeight: 200,
              overflowY: 'auto',
              bgcolor: 'grey.50',
              border: 1,
              borderColor: 'grey.200',
              borderRadius: 1,
              p: 1,
            }}
          >
            <List dense disablePadding>
              {logs.map((log, index) => (
                <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={log}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isMigrating} color="inherit">
          {completed ? 'Cerrar' : 'Cancelar'}
        </Button>

        {!completed && pendingProperties.length > 0 && (
          <Button
            onClick={handleStartMigration}
            variant="contained"
            color="primary"
            disabled={isMigrating}
            startIcon={<AutoFixHigh />}
          >
            {isMigrating ? 'Optimizando...' : 'Comenzar optimización'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
