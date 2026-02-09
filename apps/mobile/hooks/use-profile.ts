import { useState, useEffect, useCallback, useRef } from 'react';

import { getProfile, updateProfile, getUserStats } from '../lib/api/profile';
import { UserProfile, UserStats, UpdateProfileData } from '../lib/types/profile';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ postCount: 0, connectionCount: 0, bookmarkCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileData, statsData] = await Promise.all([
        getProfile(),
        getUserStats().catch(() => ({ postCount: 0, connectionCount: 0, bookmarkCount: 0 })),
      ]);
      if (!mountedRef.current) return;
      setProfile(profileData);
      setStats(statsData);
    } catch {
      if (mountedRef.current) setError('Failed to load profile');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const update = useCallback(async (data: UpdateProfileData) => {
    const updated = await updateProfile(data);
    if (mountedRef.current) setProfile(updated);
    return updated;
  }, []);

  return { profile, stats, loading, error, refresh: loadData, update };
}
