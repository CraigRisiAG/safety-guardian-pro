import { mockDrills } from '@/data/mockData';
import { Drill } from '@/types/safety';

export const DRILLS_STORAGE_KEY = 'safeguard_drills';

type RawDrill = Omit<Drill, 'startedAt' | 'completedAt' | 'scheduledFor'> & {
  startedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
};

function parseDateSafe(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function parseDrill(raw: RawDrill): Drill {
  const safeStatus: Drill['status'] =
    raw.status === 'active' || raw.status === 'scheduled' || raw.status === 'completed' || raw.status === 'cancelled'
      ? raw.status
      : 'scheduled';

  const safeLocation = {
    buildingId: raw.location?.buildingId ?? 'unknown-building',
    buildingIds: Array.isArray(raw.location?.buildingIds) ? raw.location.buildingIds : undefined,
    floorIds: Array.isArray(raw.location?.floorIds) ? raw.location.floorIds : [],
    areaIds: Array.isArray(raw.location?.areaIds) ? raw.location.areaIds : [],
  };

  return {
    ...raw,
    status: safeStatus,
    operationKind: raw.operationKind === 'emergency' ? 'emergency' : 'drill',
    operationLabel: typeof raw.operationLabel === 'string' && raw.operationLabel.trim().length > 0
      ? raw.operationLabel
      : undefined,
    location: safeLocation,
    startedAt: parseDateSafe(raw.startedAt),
    completedAt: parseDateSafe(raw.completedAt),
    scheduledFor: parseDateSafe(raw.scheduledFor),
  };
}

function isDrillArray(value: unknown): value is RawDrill[] {
  return Array.isArray(value);
}

export function saveDrillsToStorage(drills: Drill[]) {
  try {
    localStorage.setItem(DRILLS_STORAGE_KEY, JSON.stringify(drills));
  } catch {
    // no-op: storage may be unavailable (private mode/security policy)
  }
}

export function loadDrillsFromStorage(): Drill[] {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(DRILLS_STORAGE_KEY);
  } catch {
    return mockDrills;
  }

  if (!stored) {
    saveDrillsToStorage(mockDrills);
    return mockDrills;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isDrillArray(parsed)) {
      saveDrillsToStorage(mockDrills);
      return mockDrills;
    }

    const normalized = parsed.map(parseDrill);
    saveDrillsToStorage(normalized);
    return normalized;
  } catch {
    saveDrillsToStorage(mockDrills);
    return mockDrills;
  }
}

export function getDrillsStorageSnapshot(): string | null {
  try {
    return localStorage.getItem(DRILLS_STORAGE_KEY);
  } catch {
    return null;
  }
}
