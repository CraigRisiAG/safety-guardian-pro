import { SafetyCheckIn } from '@/types/safety';

export const CHECK_INS_STORAGE_KEY = 'safeguard_check_ins';

type RawCheckIn = Omit<SafetyCheckIn, 'checkedInAt'> & {
  checkedInAt?: string;
};

const readStorage = (): string | null => {
  try {
    return localStorage.getItem(CHECK_INS_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStorage = (value: string) => {
  try {
    localStorage.setItem(CHECK_INS_STORAGE_KEY, value);
  } catch {
    // no-op
  }
};

const parseCheckIn = (raw: RawCheckIn): SafetyCheckIn => ({
  ...raw,
  checkedInAt: raw.checkedInAt ? new Date(raw.checkedInAt) : undefined,
});

const isCheckInArray = (value: unknown): value is RawCheckIn[] => Array.isArray(value);

export function saveCheckInsToStorage(checkIns: SafetyCheckIn[]) {
  writeStorage(JSON.stringify(checkIns));
}

export function loadCheckInsFromStorage(): SafetyCheckIn[] {
  const stored = readStorage();
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isCheckInArray(parsed)) {
      return [];
    }

    return parsed.map(parseCheckIn);
  } catch {
    return [];
  }
}

export function loadCheckInsForDrill(drillId: string): SafetyCheckIn[] {
  return loadCheckInsFromStorage().filter((checkIn) => checkIn.drillId === drillId);
}

export function addCheckInsToStorage(newEntries: SafetyCheckIn[]) {
  const current = loadCheckInsFromStorage();
  saveCheckInsToStorage([...
    newEntries,
    ...current,
  ]);
}

export function getCheckInsStorageSnapshot(): string | null {
  return readStorage();
}
