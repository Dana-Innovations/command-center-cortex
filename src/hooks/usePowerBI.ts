'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PowerBIKPI, PowerBIReportConfig } from '@/lib/types';

export function usePowerBI() {
  const [kpis, setKpis] = useState<PowerBIKPI[]>([]);
  const [reportConfigs, setReportConfigs] = useState<PowerBIReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [kpiResult, reportResult] = await Promise.all([
      supabase
        .from('powerbi_kpis')
        .select('*')
        .order('kpi_category', { ascending: true }),
      supabase
        .from('powerbi_report_configs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    if (kpiResult.error) {
      setError(kpiResult.error.message);
    } else {
      setKpis(kpiResult.data as PowerBIKPI[]);
    }

    if (reportResult.error) {
      setError((prev) =>
        prev ? `${prev}; ${reportResult.error!.message}` : reportResult.error!.message
      );
    } else {
      setReportConfigs(reportResult.data as PowerBIReportConfig[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();

    const kpiChannel = supabase
      .channel('powerbi-kpis-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'powerbi_kpis' },
        (payload) => {
          setKpis((prev) => [payload.new as PowerBIKPI, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'powerbi_kpis' },
        (payload) => {
          const row = payload.new as PowerBIKPI;
          setKpis((prev) => prev.map((k) => (k.id === row.id ? row : k)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'powerbi_kpis' },
        (payload) => {
          setKpis((prev) =>
            prev.filter((k) => k.id !== (payload.old as PowerBIKPI).id)
          );
        }
      )
      .subscribe();

    const reportChannel = supabase
      .channel('powerbi-reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'powerbi_report_configs' },
        (payload) => {
          setReportConfigs((prev) => [
            payload.new as PowerBIReportConfig,
            ...prev,
          ]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'powerbi_report_configs' },
        (payload) => {
          const row = payload.new as PowerBIReportConfig;
          setReportConfigs((prev) =>
            prev.map((r) => (r.id === row.id ? row : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'powerbi_report_configs' },
        (payload) => {
          setReportConfigs((prev) =>
            prev.filter(
              (r) => r.id !== (payload.old as PowerBIReportConfig).id
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kpiChannel);
      supabase.removeChannel(reportChannel);
    };
  }, [fetchData, supabase]);

  const kpisByCategory = useMemo(() => {
    const grouped: Record<string, PowerBIKPI[]> = {};
    for (const kpi of kpis) {
      if (!grouped[kpi.kpi_category]) grouped[kpi.kpi_category] = [];
      grouped[kpi.kpi_category].push(kpi);
    }
    return grouped;
  }, [kpis]);

  return { kpis, kpisByCategory, reportConfigs, loading, error };
}
