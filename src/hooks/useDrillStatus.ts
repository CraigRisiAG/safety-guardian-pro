import { useState, useEffect, useCallback } from 'react';
import { Drill, DrillRecord } from '@/types/safety';
import { buildings } from '@/data/mockData';
import { loadCheckInsForDrill } from '@/lib/checkInsStorage';
import { loadDrillsFromStorage, saveDrillsToStorage } from '@/lib/drillsStorage';

const ACTIVE_DRILL_KEY = 'active_drill';
const DRILL_RECORDS_KEY = 'drill_records';
const ADMIN_SETTINGS_KEY = 'safeguard_admin_settings';

type StoredDrillRecord = Omit<DrillRecord, 'startedAt' | 'completedAt'> & {
  startedAt?: string;
  completedAt?: string;
};

type StoredArea = { id?: string; name?: string };
type StoredFloor = { id?: string; name?: string; areas?: StoredArea[] };
type StoredBuilding = { id?: string; name?: string; floors?: StoredFloor[] };

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
        buildingIds: Array.isArray(parsed.location.buildingIds) ? parsed.location.buildingIds : undefined,
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

    return (parsed as StoredDrillRecord[])
      .map((record) => ({
        ...record,
        startedAt: parseDateSafe(record?.startedAt) ?? new Date(),
        completedAt: parseDateSafe(record?.completedAt) ?? new Date(),
      }))
      .filter((record) => typeof record.id === 'string' && typeof record.drillId === 'string');
  } catch {
    return [];
  }
};

const pickLikelyActiveDrill = (drills: Drill[]): Drill | null => {
  const explicitActive = drills.find((drill) => drill.status === 'active');
  if (explicitActive) {
    return explicitActive;
  }

  const inferredActive = drills
    .filter((drill) => {
      if (drill.status === 'completed' || drill.status === 'cancelled') {
        return false;
      }
      return !!drill.startedAt && !drill.completedAt;
    })
    .sort((left, right) => {
      const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
      const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
      return rightTime - leftTime;
    })[0];

  return inferredActive ?? null;
};

const resolveActiveDrill = (): Drill | null => {
  const fromDedicatedStorage = parseActiveDrill(readStorage(ACTIVE_DRILL_KEY));
  if (fromDedicatedStorage?.status === 'active') {
    return fromDedicatedStorage;
  }

  const fromDrillsList = pickLikelyActiveDrill(loadDrillsFromStorage());
  if (fromDrillsList) {
    writeStorage(ACTIVE_DRILL_KEY, JSON.stringify({ ...fromDrillsList, status: 'active' }));
    return fromDrillsList;
  }

  return null;
};

const resolveBuildings = () => {
  try {
    const stored = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!stored) {
      return buildings;
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed?.buildings)) {
      return buildings;
    }

    return (parsed.buildings as StoredBuilding[]).map((building) => ({
      id: building.id,
      name: building.name,
      floors: Array.isArray(building.floors)
        ? building.floors.map((floor) => ({
            id: floor.id,
            name: floor.name,
            areas: Array.isArray(floor.areas)
              ? floor.areas.map((area) => ({
                  id: area.id,
                  name: area.name,
                  floorId: floor.id,
                }))
              : [],
          }))
        : [],
    }));
  } catch {
    return buildings;
  }
};

export function useDrillStatus() {
  const [activeDrill, setActiveDrill] = useState<Drill | null>(() => resolveActiveDrill());

  const [drillRecords, setDrillRecords] = useState<DrillRecord[]>(() => parseDrillRecords(readStorage(DRILL_RECORDS_KEY)));

  // Listen for storage changes from other components
  useEffect(() => {
    const handleStorage = (event?: StorageEvent) => {
      if (event && event.key && event.key !== ACTIVE_DRILL_KEY && event.key !== DRILL_RECORDS_KEY) {
        return;
      }

      setActiveDrill(resolveActiveDrill());
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
    const drills = loadDrillsFromStorage();
    const existingIndex = drills.findIndex((entry) => entry.id === activeDrillData.id);
    if (existingIndex >= 0) {
      const next = drills.map((entry) =>
        entry.id === activeDrillData.id ? { ...entry, ...activeDrillData } : entry,
      );
      saveDrillsToStorage(next);
      return;
    }

    saveDrillsToStorage([activeDrillData, ...drills]);
  }, []);

  const endDrill = useCallback((checkInStats?: { safe: number; needsAssistance: number; pending: number }, floorCheckIns?: Map<string, { safe: number; needsAssistance: number; pending: number }>) => {
    const drillToEnd = activeDrill ?? resolveActiveDrill();
    if (!drillToEnd) return;

    const completedAt = new Date();
    const startedAt = drillToEnd.startedAt || new Date();
    const durationMs = completedAt.getTime() - new Date(startedAt).getTime();
    const durationMinutes = Math.round(durationMs / 60000 * 10) / 10;

    const checkIns = loadCheckInsForDrill(drillToEnd.id);
    const allBuildings = resolveBuildings();
    const building = allBuildings.find(b => b.id === drillToEnd.location.buildingId);
    const floors = building?.floors.filter(f => drillToEnd.location.floorIds.includes(f.id)) || [];

    const persistedStats = {
      safe: checkIns.filter((checkIn) => checkIn.status === 'safe').length,
      needsAssistance: checkIns.filter((checkIn) => checkIn.status === 'needs-assistance').length,
      pending: checkIns.filter((checkIn) => checkIn.status === 'pending').length,
    };

    const stats = checkInStats || persistedStats;
    const total = stats.safe + stats.needsAssistance + stats.pending;

    const floorStats = floors.map(f => {
      const persistedFloorStats = checkIns.reduce(
        (acc, checkIn) => {
          if (checkIn.location.floorId !== f.id) {
            return acc;
          }

          if (checkIn.status === 'safe') {
            return { ...acc, safe: acc.safe + 1 };
          }
          if (checkIn.status === 'needs-assistance') {
            return { ...acc, needsAssistance: acc.needsAssistance + 1 };
          }
          return { ...acc, pending: acc.pending + 1 };
        },
        { safe: 0, needsAssistance: 0, pending: 0 },
      );

      const fStats = floorCheckIns?.get(f.id) || persistedFloorStats;
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
      drillId: drillToEnd.id,
      type: drillToEnd.type,
      buildingId: drillToEnd.location.buildingId,
      buildingName: building?.name || 'Unknown',
      floors: floors.map(f => ({ id: f.id, name: f.name })),
      startedAt: new Date(startedAt),
      completedAt,
      durationMinutes,
      initiatedBy: drillToEnd.initiatedBy,
      checkInStats: { total, ...stats },
      floorStats,
    };

    const updatedRecords = [record, ...drillRecords];
    setDrillRecords(updatedRecords);
    writeStorage(DRILL_RECORDS_KEY, JSON.stringify(updatedRecords));

    setActiveDrill(null);
    removeStorage(ACTIVE_DRILL_KEY);

    const drills = loadDrillsFromStorage();
    const synced = drills.map((entry) =>
      entry.id === drillToEnd.id
        ? { ...entry, status: 'completed' as const, completedAt }
        : entry,
    );
    saveDrillsToStorage(synced);

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
