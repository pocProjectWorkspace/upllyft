import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@upllyft/ui';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  markInterest,
  removeInterest,
  type EventFilters,
  type CreateEventDto,
} from '@/lib/api/events';

const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => getEvents(filters),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEvent(id),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEventDto) => createEvent(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      toast({ title: 'Event created', description: 'Your event has been published.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create event.', variant: 'destructive' });
    },
  });
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateEventDto>) => updateEvent(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      toast({ title: 'Event deleted' });
    },
  });
}

export function useMarkInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'INTERESTED' | 'GOING' }) =>
      markInterest(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useRemoveInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => removeInterest(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
