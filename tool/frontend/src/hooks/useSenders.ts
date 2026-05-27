import { useAsgardeo } from "@asgardeo/react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendersService } from "../services/sendersService";
import { QUERY_STALE_TIME } from "../utils/constants";
import { Sender } from "../types/db";


export const useSenders = (
    page: number = 1,
    pageSize: number = 10,
    onPageChange?: (page: number) => void
) => {
    const { http, isSignedIn } = useAsgardeo();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['senders', page, pageSize],
        queryFn: () => sendersService.listSenders(page, pageSize, http),
        enabled: !!isSignedIn,
        placeholderData: keepPreviousData,
        staleTime: QUERY_STALE_TIME
    });

    const createSenderMutation = useMutation({
        mutationFn: (payload: Partial<Sender>) => sendersService.create(payload, http),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        }
    });

    const updateSenderMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string, payload: Partial<Sender> }) => sendersService.update(id, payload, http),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        }
    })

    const deleteSenderMutation = useMutation({
        mutationFn: (id: string) => sendersService.remove(id, http),
        onSuccess: () => {
            if (query.data?.data?.length === 1 && page > 1 && onPageChange) {
                onPageChange(page - 1);
            }
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        }
    })

    return {
        ...query,
        createSender: createSenderMutation.mutateAsync,
        updateSender: updateSenderMutation.mutateAsync,
        deleteSender: deleteSenderMutation.mutateAsync,
        isCreating: createSenderMutation.isPending,
        isUpdating: updateSenderMutation.isPending,
        isDeleting: deleteSenderMutation.isPending
    }

}