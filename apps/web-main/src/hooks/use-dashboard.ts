import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '@/lib/api/profiles';
import { getTherapistAnalytics, getMyBookings } from '@/lib/api/marketplace';
import { getTrendingPosts } from '@/lib/api/posts';

export function useMyProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
    retry: 1,
  });
}

export function useTherapistAnalytics() {
  return useQuery({
    queryKey: ['therapist', 'analytics'],
    queryFn: getTherapistAnalytics,
    retry: 1,
  });
}

export function useMyBookings(status?: string) {
  return useQuery({
    queryKey: ['bookings', status],
    queryFn: () => getMyBookings(status),
    retry: 1,
  });
}

export function useUpcomingBookings() {
  return useQuery({
    queryKey: ['bookings', 'upcoming'],
    queryFn: () => getMyBookings('CONFIRMED'),
    retry: 1,
    select: (data) => {
      const now = new Date();
      return data
        .filter((b) => new Date(b.startDateTime) > now)
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
        .slice(0, 5);
    },
  });
}

export function useTrendingPosts() {
  return useQuery({
    queryKey: ['posts', 'trending'],
    queryFn: () => getTrendingPosts(5),
    retry: 1,
  });
}
