import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAsgardeo } from '@asgardeo/react';
import { rtiRequestsService } from '../services/rtiRequestsService';

export function useRTIRequest(page: number = 1, pageSize: number = 10, search?: string, onPageChange?: (page: number) => void) {
  const { http, isSignedIn } = useAsgardeo();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rti-requests', page, pageSize, search],
    queryFn: () => rtiRequestsService.list(page, pageSize, search, http),
    enabled: !!isSignedIn,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title?: string, description?: string | null, senderId?: string, receiverId?: string, rtiTemplateId?: string, content?: string, file?: File, createdDate?: string }) =>
      rtiRequestsService.create(payload, http),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rti-requests'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rtiRequestsService.remove(id, http),
    onSuccess: () => {
      if (query.data?.data?.length === 1 && page > 1 && onPageChange) {
        onPageChange(page - 1);
      }
      queryClient.invalidateQueries({ queryKey: ['rti-requests'] });
    },
  });

  return {
    ...query,
    data: query.data?.data || [],
    pagination: query.data?.pagination || { page: 1, pageSize: 10, totalPages: 1, totalItems: 0 },
    createRTIRequest: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    confirmDelete: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useRTIRequestDetail(id: number) {
  const { http, isSignedIn } = useAsgardeo();

  return useQuery({
    queryKey: ['rti-requests', id],
    queryFn: () => rtiRequestsService.getById(id, http),
    enabled: !!isSignedIn && !!id,
  });
}
