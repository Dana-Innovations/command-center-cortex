'use client';

import { useMemo } from 'react';
import { useLiveData } from '@/lib/live-data-context';

export function useSalesforce() {
  const { opportunities, loading, error } = useLiveData();

  const openOpps = useMemo(
    () => opportunities.filter((o) => !o.is_closed),
    [opportunities]
  );

  const closedWonOpps = useMemo(
    () => opportunities.filter((o) => o.is_closed && o.is_won),
    [opportunities]
  );

  return { opportunities, openOpps, closedWonOpps, reports: [], loading, error };
}
