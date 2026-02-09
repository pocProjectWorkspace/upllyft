import { useState, useEffect, useCallback } from 'react';
import { Booking } from '../lib/types/marketplace';
import { getBookings } from '../lib/api/marketplace';

export function useBookings(statusFilter?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await getBookings(statusFilter);
      setBookings(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetch().finally(() => setLoading(false));
  }, [statusFilter]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  return { bookings, loading, refreshing, refresh };
}
