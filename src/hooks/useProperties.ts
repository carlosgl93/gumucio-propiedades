import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { propertyService } from '@/services/property';

import { Property } from '../models/property';

// Query Keys
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters?: {
    status?: string;
    propertyType?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }) => [...propertyKeys.lists(), { filters }] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  available: () => [...propertyKeys.all, 'available'] as const,
  featured: () => [...propertyKeys.all, 'featured'] as const,
};

// Get all properties
export const useProperties = (filters?: {
  status?: string;
  propertyType?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}) => {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => propertyService.getAllProperties(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get available properties
export const useAvailableProperties = () => {
  return useQuery({
    queryKey: propertyKeys.available(),
    queryFn: () => propertyService.getAvailableProperties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAllProperties = () => {
  return useQuery({
    queryKey: propertyKeys.all,
    queryFn: () => propertyService.getAllProperties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get featured properties
export const useFeaturedProperties = () => {
  return useQuery({
    queryKey: propertyKeys.featured(),
    queryFn: () => propertyService.getFeaturedProperties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single property
export const useProperty = (id: string) => {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => propertyService.getProperty(id),
    enabled: !!id,
  });
};

// Create property mutation
export const useCreateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) =>
      propertyService.createProperty(property),
    onSuccess: () => {
      // Invalidate and refetch properties list
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.available() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.featured() });
    },
  });
};

// Update property mutation
export const useUpdateProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Property> }) =>
      propertyService.updateProperty(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.available() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.featured() });
    },
  });
};

// Delete property mutation
export const useDeleteProperty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => propertyService.deleteProperty(id),
    onSuccess: () => {
      // Invalidate all property-related queries
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
};

// Upload image mutation
export const useUploadPropertyImage = () => {
  return useMutation({
    mutationFn: ({
      propertyId,
      file,
      caption,
    }: {
      propertyId: string;
      file: File;
      caption?: string;
    }) => propertyService.uploadPropertyImage(propertyId, file, caption),
  });
};

// Delete image mutation
export const useDeletePropertyImage = () => {
  return useMutation({
    mutationFn: ({ propertyId, imageId }: { propertyId: string; imageId: string }) =>
      propertyService.deletePropertyImage(propertyId, imageId),
  });
};

// hooks/usePropertyStats.ts
export const usePropertyStats = () => {
  const { data: properties = [], isLoading } = useProperties();

  const stats = {
    total: properties.length,
    available: properties.filter((p: Property) => p.status === 'disponible' && p.isActive).length,
    sold: properties.filter((p: Property) => p.status === 'vendido').length,
    featured: properties.filter((p: Property) => p.isFeatured).length,
  };

  return { stats, isLoading };
};
