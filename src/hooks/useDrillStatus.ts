import { useState, useEffect, useCallback } from 'react';
import { Drill, DrillRecord } from '@/types/safety';
import { buildings } from '@/data/mockData';

const ACTIVE_DRILL_KEY = 'active_drill';
const DRILL_RECORDS_KEY = 'drill_records';

const parseDateSafe = (value: unknown): Date | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const removeStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
};

const parseActiveDrill = (stored: string | null): Drill | null => {
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Drill>;
    if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.type || !parsed.location?.buildingId) {
      return null;
    }

    return {
      id: parsed.id,
      type: parsed.type,
      status: parsed.status === 'active' || parsed.status === 'scheduled' || parsed.status === 'completed' || parsed.status === 'cancelled'
        ? parsed.status
        : 'active',
      location: {
        buildingId: parsed.location.buildingId,
        floorIds: Array.isArray(parsed.location.floorIds) ? parsed.location.floorIds : [],
        areaIds: Array.isArray(parsed.location.areaIds) ? parsed.location.areaIds : [],
      },
      startedAt: parseDateSafe(typeof parsed.startedAt === 'string' ? parsed.startedAt : undefined),
      completedAt: parseDateSafe(typeof parsed.completedAt === 'string' ? parsed.completedAt : undefined),
      scheduledFor: parseDateSafe(typeof parsed.scheduledFor === 'string' ? parsed.scheduledFor : undefined),
      initiatedBy: typeof parsed.initiatedBy === 'string' ? parsed.initiatedBy : 'Unknown',
    };
  } catch {
    return null;
  }
};

const parseDrillRecords = (stored: string | null): DrillRecord[] => {
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((record: any) => ({
        ...record,
        startedAt: parseDateSafe(record?.startedAt) ?? new Date(),
        completedAt: parseDateSafe(record?.completedAt) ?? new Date(),
      }))
      .filter((record) => typeof record.id === 'string' && typeof record.drillId === 'string');
  } catch {
    return [];
  }
};

export function useDrillStatus() {
  const [activeDrill, setActiveDrill] = useState<Drill | null>(() => parseActiveDrill(readStorage(ACTIVE_DRILL_KEY)));

  const [drillRecords, setDrillRecords] = useState<DrillRecord[]>(() => parseDrillRecords(readStorage(DRILL_RECORDS_KEY)));

  // Listen for storage changes from other components
  useEffect(() => {
    const handleStorage = () => {
      setActiveDrill(parseActiveDrill(readStorage(ACTIVE_DRILL_KEY)));
      setDrillRecords(parseDrillRecords(readStorage(DRILL_RECORDS_KEY)));
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
    writeStorage(ACTIVE_DRILL_KEY, JSON.stringify(activeDrillData));
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
    writeStorage(DRILL_RECORDS_KEY, JSON.stringify(updatedRecords));

    setActiveDrill(null);
    removeStorage(ACTIVE_DRILL_KEY);

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
