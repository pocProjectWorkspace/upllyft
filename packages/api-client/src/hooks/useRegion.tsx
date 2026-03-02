'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getRegionConfig, type RegionConfig, type ServiceModel } from '@upllyft/types';

export interface RegionContextValue {
  region: RegionConfig | null;
  serviceModel: ServiceModel | null;
  currency: string;
  isSupported: boolean;
  isRegionResolved: boolean;
}

export function useRegion(): RegionContextValue {
  const { user } = useAuth();

  return useMemo(() => {
    const effectiveCountry = user?.country || user?.preferredRegion || null;
    const region = getRegionConfig(effectiveCountry);

    return {
      region,
      serviceModel: region?.serviceModel ?? null,
      currency: region?.currency ?? 'INR',
      isSupported: !!region,
      isRegionResolved: !!effectiveCountry,
    };
  }, [user?.country, user?.preferredRegion]);
}
