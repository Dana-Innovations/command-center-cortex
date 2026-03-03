'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SalesforceOpportunity, SalesforceReport } from '@/lib/types';

const supabase = createClient();

export function useSalesforce() {
  const [opportunities, setOpportunities] = useState<SalesforceOpportunity[]>([]);
  const [reports, setReports] = useState<SalesforceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [oppResult, repResult] = await Promise.all([
      supabase
        .from('salesforce_opportunities')
        .select('*')
        .order('close_date', { ascending: true }),
      supabase
        .from('salesforce_reports')
        .select('*')
        .order('last_run_date', { ascending: false }),
    ]);

    if (oppResult.error) {
      setError(oppResult.error.message);
    } else {
      setOpportunities(oppResult.data as SalesforceOpportunity[]);
    }

    if (repResult.error) {
      setError((prev) => prev ? `${prev}; ${repResult.error!.message}` : repResult.error!.message);
    } else {
      setReports(repResult.data as SalesforceReport[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const oppChannel = supabase
      .channel('sf-opportunities-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'salesforce_opportunities' },
        (payload) => {
          const row = payload.new as SalesforceOpportunity;
          setOpportunities((prev) => [row, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salesforce_opportunities' },
        (payload) => {
          const row = payload.new as SalesforceOpportunity;
          setOpportunities((prev) =>
            prev.map((o) => (o.id === row.id ? row : o))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'salesforce_opportunities' },
        (payload) => {
          setOpportunities((prev) => prev.filter((o) => o.id !== (payload.old as SalesforceOpportunity).id));
        }
      )
      .subscribe();

    const repChannel = supabase
      .channel('sf-reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'salesforce_reports' },
        (payload) => {
          setReports((prev) => [payload.new as SalesforceReport, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'salesforce_reports' },
        (payload) => {
          setReports((prev) =>
            prev.map((r) => (r.id === (payload.new as SalesforceReport).id ? (payload.new as SalesforceReport) : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'salesforce_reports' },
        (payload) => {
          setReports((prev) => prev.filter((r) => r.id !== (payload.old as SalesforceReport).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(oppChannel);
      supabase.removeChannel(repChannel);
    };
  }, [fetchData]);

  const openOpps = useMemo(
    () => opportunities.filter((o) => !o.is_closed),
    [opportunities]
  );

  const closedWonOpps = useMemo(
    () => opportunities.filter((o) => o.is_closed && o.is_won),
    [opportunities]
  );

  return { opportunities, openOpps, closedWonOpps, reports, loading, error };
}
