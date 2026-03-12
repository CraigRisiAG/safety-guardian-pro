import { useState, useEffect, useCallback } from 'react';
import { Drill, DrillRecord } from '@/types/safety';
import { buildings } from '@/data/mockData';

const ACTIVE_DRILL_KEY = 'active_drill';
const DRILL_RECORDS_KEY = 'drill_records';

export function useDrillStatus() {
  const [activeDrill, setActiveDrill] = useState<Drill | null>(() => {
    const stored = localStorage.getItem(ACTIVE_DRILL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
        completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
        scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : undefined,
      };
    }
    return null;
  });

  const [drillRecords, setDrillRecords] = useState<DrillRecord[]>(() => {
    const stored = localStorage.getItem(DRILL_RECORDS_KEY);
    if (stored) {
      return JSON.parse(stored).map((r: any) => ({
        ...r,
        startedAt: new Date(r.startedAt),
        completedAt: new Date(r.completedAt),
      }));
    }
    return [];
  });

  // Listen for storage changes from other components
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem(ACTIVE_DRILL_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setActiveDrill({
          ...parsed,
          startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined,
          scheduledFor: parsed.scheduledFor ? new Date(parsed.scheduledFor) : undefined,
        });
      } else {
        setActiveDrill(null);
      }
    };

    window.addEventListener('storage', handleStorage);
    // Also poll for same-tab changes
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const startDrill = useCallback((drill: Drill) => {
    const activeDrillData = { ...drill, status: 'active' as const, startedAt: new Date() };
    setActiveDrill(activeDrillData);
    localStorage.setItem(ACTIVE_DRILL_KEY, JSON.stringify(activeDrillData));
  }, []);

  const endDrill = useCallback((checkInStats?: { safe: number; needsAssistance: number; pending: number }, floorCheckIns?: Map<string, { safe: number; needsAssistance: number; pending: number }>) => {
    if (!activeDrill) return;

    const completedAt = new Date();
    const startedAt = activeDrill.startedAt || new Date();
    const durationMs = completedAt.getTime() - new Date(startedAt).getTime();
    const durationMinutes = Math.round(durationMs / 60000 * 10) / 10;

    const building = buildings.find(b => b.id === activeDrill.location.buildingId);
    const floors = building?.floors.filter(f => activeDrill.location.floorIds.includes(f.id)) || [];

    const stats = checkInStats || { safe: 0, needsAssistance: 0, pending: 0 };
    const total = stats.safe + stats.needsAssistance + stats.pending;

    const floorStats = floors.map(f => {
      const fStats = floorCheckIns?.get(f.id) || { safe: 0, needsAssistance: 0, pending: 0 };
      return {
        floorId: f.id,
        floorName: f.name,
        safe: fStats.safe,
        needsAssistance: fStats.needsAssistance,
        pending: fStats.pending,
      };
    });

    const record: DrillRecord = {
      id: `record-${Date.now()}`,
      drillId: activeDrill.id,
      type: activeDrill.type,
      buildingId: activeDrill.location.buildingId,
      buildingName: building?.name || 'Unknown',
      floors: floors.map(f => ({ id: f.id, name: f.name })),
      startedAt: new Date(startedAt),
      completedAt,
      durationMinutes,
      initiatedBy: activeDrill.initiatedBy,
      checkInStats: { total, ...stats },
      floorStats,
    };

    const updatedRecords = [record, ...drillRecords];
    setDrillRecords(updatedRecords);
    localStorage.setItem(DRILL_RECORDS_KEY, JSON.stringify(updatedRecords));

    setActiveDrill(null);
    localStorage.removeItem(ACTIVE_DRILL_KEY);

    return record;
  }, [activeDrill, drillRecords]);

  const isCheckInEnabled = activeDrill !== null && activeDrill.status === 'active';

  return {
    activeDrill,
    isCheckInEnabled,
    drillRecords,
    startDrill,
    endDrill,
  };
}
