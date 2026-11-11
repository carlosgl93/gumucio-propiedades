// components/AdminDashboard.tsx
import { useMemo, useState } from 'react';

import {
  Add,
  AutoFixHigh,
  Delete,
  Description,
  Edit,
  ExitToApp,
  Home,
  Refresh,
  Search,
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
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { Property } from '@/models';
import { PostulacionesList } from '@/sections/Postulaciones';
import { formatPrice } from '@/utils/formatters';

import { useAuth } from '../hooks/useAuth';
import { useDeleteProperty, useProperties, usePropertyStats } from '../hooks/useProperties';
import { ImageMigrationDialog } from './ImageMigrationDialog';
import { PropertyForm } from './PropertyForm';
import { PropertyShareButtons } from './PropertyShareButtons';
import { VisitOrderDialog } from './VisitOrderDialog';

export const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState<'Propiedades' | 'Postulaciones'>('Propiedades');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [propertyToShare, setPropertyToShare] = useState<Property | null>(null);
  const [visitOrderDialogOpen, setVisitOrderDialogOpen] = useState(false);
  const [propertyForVisitOrder, setPropertyForVisitOrder] = useState<Property | null>(null);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { logout, user } = useAuth();

  // TanStack Query hooks
  const {
    data: properties = [],
    isLoading,
    error,
    refetch,
  } = useProperties({
    visibility: 'admin',
  });

  const { stats, isLoading: statsLoading } = usePropertyStats('admin');
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

  const handleVisitOrderClick = (property: Property) => {
    setPropertyForVisitOrder(property);
    setVisitOrderDialogOpen(true);
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
      case 'no_disponible':
        return 'error';
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
      case 'no_disponible':
        return 'No disponible';
      default:
        return status;
    }
  };

  // Filter properties based on search query - memoized for performance
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return (
        property.title?.toLowerCase().includes(query) ||
        property.address?.street?.toLowerCase().includes(query) ||
        property.address?.commune?.toLowerCase().includes(query) ||
        property.address?.city?.toLowerCase().includes(query)
      );
    });
  }, [properties, searchQuery]);

  if (showForm) {
    return (
      <Box p={3}>
        <PropertyForm
          property={selectedProperty || undefined}
          onSave={handleSaveProperty}
          onCancel={handleCancelForm}
        />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={2}
        mb={4}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Panel de Administración
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bienvenido, {user?.displayName || user?.email}
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Actualizar
          </Button>
          <Button variant="outlined" color="error" startIcon={<ExitToApp />} onClick={logout}>
            Cerrar Sesión
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={currentTab}
        onChange={(_, value: 'Propiedades' | 'Postulaciones') => setCurrentTab(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Propiedades" value="Propiedades" />
        <Tab label="Postulaciones" value="Postulaciones" />
      </Tabs>

      {currentTab === 'Postulaciones' && user?.uid && <PostulacionesList uploadedBy={user.uid} />}

      {/* Error Alert */}
      {currentTab === 'Propiedades' && error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        >
          Error al cargar propiedades: {error.message}
        </Alert>
      )}

      {/* Delete Error */}
      {currentTab === 'Propiedades' && deleteProperty.error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => deleteProperty.reset()}>
          Error al eliminar propiedad: {deleteProperty.error.message}
        </Alert>
      )}

      {currentTab === 'Propiedades' && (
        <>
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
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={2}
                mb={3}
              >
                <Typography variant="h6" component="h2">
                  Propiedades
                  {!isLoading && (
                    <Chip
                      label={`${filteredProperties.length} ${searchQuery ? 'filtradas' : 'total'}`}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AutoFixHigh />}
                    onClick={() => setMigrationDialogOpen(true)}
                    disabled={isLoading}
                  >
                    Optimizar a WebP
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateProperty}
                    disabled={isLoading}
                  >
                    Nueva Propiedad
                  </Button>
                </Box>
              </Box>

              {/* Search Bar */}
              <Box mb={3}>
                <TextField
                  fullWidth
                  placeholder="Buscar por título, dirección, comuna o ciudad..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
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
                        <TableCell>Propietario</TableCell>
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
                      {filteredProperties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography color="text.secondary">
                              {searchQuery
                                ? 'No se encontraron propiedades con ese criterio de búsqueda'
                                : 'No hay propiedades registradas'}
                            </Typography>
                            {!searchQuery && (
                              <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={handleCreateProperty}
                                sx={{ mt: 2 }}
                              >
                                Crear la primera propiedad
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProperties.map((property) => (
                          <TableRow key={property.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" noWrap sx={{ maxWidth: 200 }}>
                                {property.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {property.address.street}, {property.address.commune}
                              </Typography>
                            </TableCell>
                            <TableCell>{property.ownerName || '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={property.type}
                                size="small"
                                variant="outlined"
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>
                              {formatPrice(
                                typeof property.price === 'number'
                                  ? property.price
                                  : ((property.price as unknown as { amount?: number })?.amount ??
                                      0),
                                property.currency ||
                                  (property.price as unknown as { currency?: string })?.currency ||
                                  'CLP',
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusLabel(property.status)}
                                color={getStatusColor(property.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{property.address.city}</TableCell>
                            <TableCell>
                              {property.featured ? (
                                <Star color="warning" fontSize="small" />
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  No
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={property.active ? 'Activa' : 'Inactiva'}
                                color={property.active ? 'success' : 'default'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => handleEditProperty(property)}
                                size="small"
                                color="primary"
                                title="Editar"
                                disabled={deleteProperty.isPending}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                onClick={() => handleVisitOrderClick(property)}
                                size="small"
                                color="secondary"
                                title="Generar Orden de Visita"
                                disabled={deleteProperty.isPending}
                              >
                                <Description />
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
                                {deleteProperty.isPending &&
                                propertyToDelete?.id === property.id ? (
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
        </>
      )}

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

      {/* Visit Order Dialog */}
      <VisitOrderDialog
        open={visitOrderDialogOpen}
        property={propertyForVisitOrder}
        onClose={() => {
          setVisitOrderDialogOpen(false);
          setPropertyForVisitOrder(null);
        }}
      />

      {/* Image Migration Dialog */}
      <ImageMigrationDialog
        open={migrationDialogOpen}
        properties={properties}
        onClose={() => setMigrationDialogOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </Box>
  );
};
