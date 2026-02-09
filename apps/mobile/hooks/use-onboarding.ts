import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/auth-context';

export function useOnboarding() {
  const { isAuthenticated } = useAuth();
  const [flow, setFlow] = useState<'parent' | 'therapist' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        if (!isAuthenticated) {
          setFlow(null);
          setLoading(false);
          return;
        }
        const res = await api.get('/onboarding/check');
        const data = res.data as { showOnboarding: boolean; flow: 'parent' | 'therapist' | null };
        setFlow(data.showOnboarding ? data.flow : null);
      } catch (error) {
        console.error('Failed to check onboarding:', error);
        setFlow(null);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [isAuthenticated]);

  const dismiss = () => setFlow(null);

  return { flow, loading, dismiss };
}
