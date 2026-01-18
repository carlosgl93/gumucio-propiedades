// components/AdminDashboard.tsx
import { useState } from 'react';

import {
  Add,
  Delete,
  Edit,
  ExitToApp,
  Home,
  Refresh,
  Share,
  Star,
  TrendingUp,
  Visibility,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { Property } from '@/models';

import { useAuth } from '../hooks/useAuth';
import { useDeleteProperty, useProperties, usePropertyStats } from '../hooks/useProperties';
import { PropertyForm } from './PropertyForm';
import { PropertyShareButtons } from './PropertyShareButtons';

export const AdminDashboard = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [propertyToShare, setPropertyToShare] = useState<Property | null>(null);

  const { logout, user } = useAuth();

  // TanStack Query hooks
  const { data: properties = [], isLoading, error, refetch } = useProperties();

  const { stats, isLoading: statsLoading } = usePropertyStats();
  const deleteProperty = useDeleteProperty();

  const handleCreateProperty = () => {
    setSelectedProperty(null);
    setShowForm(true);
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setShowForm(true);
  };

  const handleSaveProperty = () => {
    setShowForm(false);
    setSelectedProperty(null);
    // Data will be automatically refetched due to query invalidation
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleShareClick = (property: Property) => {
    setPropertyToShare(property);
    setShareDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propertyToDelete?.id) return;

    try {
      await deleteProperty.mutateAsync(propertyToDelete.id);
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (err) {
      console.error('Error deleting property:', err);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'success';
      case 'vendido':
        return 'default';
      case 'arrendado':
        return 'info';
      case 'reservado':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'Disponible';
      case 'vendido':
        return 'Vendido';
      case 'arrendado':
        return 'Arrendado';
      case 'reservado':
        return 'Reservado';
      default:
        return status;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('es-CL');
    return `${formatter.format(price)} ${currency}`;
  };

  if (showForm) {
    return (
      <PropertyForm
        property={selectedProperty}
        onSave={handleSaveProperty}
        onCancel={handleCancelForm}
      />
    );
  }

  return (
    <Box
      sx={{
        p: 3,
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        sx={{
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Panel de Administración
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Bienvenida, {user?.email}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <IconButton onClick={handleRefresh} disabled={isLoading} title="Actualizar datos">
            <Refresh />
          </IconButton>
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={logout} color="inherit">
            Cerrar Sesión
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        >
          Error al cargar las propiedades: {error.message}
        </Alert>
      )}

      {/* Delete Error */}
      {deleteProperty.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => deleteProperty.reset()}>
          Error al eliminar propiedad: {deleteProperty.error.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Home color="primary" />
                <Box>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats.total}
                  </Typography>
                  <Typography color="text.secondary">Total Propiedades</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUp color="success" />
                <Box>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats.available}
                  </Typography>
                  <Typography color="text.secondary">Disponibles</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Visibility color="info" />
                <Box>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats.sold}
                  </Typography>
                  <Typography color="text.secondary">Vendidas</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Star color="warning" />
                <Box>
                  <Typography variant="h4">
                    {statsLoading ? <CircularProgress size={24} /> : stats.featured}
                  </Typography>
                  <Typography color="text.secondary">Destacadas</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Properties Table */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Propiedades
              {!isLoading && (
                <Chip label={`${properties.length} total`} size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateProperty}
              disabled={isLoading}
            >
              Nueva Propiedad
            </Button>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Título</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Ciudad</TableCell>
                    <TableCell>Destacada</TableCell>
                    <TableCell>Activa</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {properties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">
                          No hay propiedades registradas
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={handleCreateProperty}
                          sx={{ mt: 2 }}
                        >
                          Crear Primera Propiedad
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <Typography variant="subtitle2">{property.title}</Typography>
                        </TableCell>
                        <TableCell>
                          {property.propertyType.charAt(0).toUpperCase() +
                            property.propertyType.slice(1)}
                        </TableCell>
                        <TableCell>{formatPrice(property.price, property.currency)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(property.status)}
                            color={
                              getStatusColor(property.status) as
                                | 'error'
                                | 'success'
                                | 'default'
                                | 'info'
                                | 'warning'
                                | 'primary'
                                | 'secondary'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{property.address.city}</TableCell>
                        <TableCell>
                          {property.isFeatured ? <Star color="warning" /> : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={property.isActive ? 'Sí' : 'No'}
                            color={property.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => handleEditProperty(property)}
                            size="small"
                            title="Editar"
                            disabled={deleteProperty.isPending}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            onClick={() => handleShareClick(property)}
                            size="small"
                            color="primary"
                            title="Compartir"
                            disabled={deleteProperty.isPending}
                          >
                            <Share />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteClick(property)}
                            size="small"
                            color="error"
                            title="Eliminar"
                            disabled={deleteProperty.isPending}
                          >
                            {deleteProperty.isPending && propertyToDelete?.id === property.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Delete />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar la propiedad "{propertyToDelete?.title}"? Esta
            acción no se puede deshacer y eliminará todas las imágenes asociadas.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteProperty.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteProperty.isPending}
            startIcon={deleteProperty.isPending ? <CircularProgress size={16} /> : undefined}
          >
            {deleteProperty.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Compartir propiedad</DialogTitle>
        <DialogContent>
          {propertyToShare && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {propertyToShare.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {propertyToShare.address.commune}, {propertyToShare.address.city}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <PropertyShareButtons property={propertyToShare} variant="full" />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button sx={{ color: 'white' }} onClick={() => setShareDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={handleCreateProperty}
        disabled={isLoading}
      >
        <Add />
      </Fab>
    </Box>
  );
};
