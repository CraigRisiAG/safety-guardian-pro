import { UserPermission } from '@/types/admin';

export const AUDIT_LOGS_STORAGE_KEY = 'safeguard_audit_logs';
export const AUDIT_LOGS_UPDATED_EVENT = 'safeguard_audit_logs_updated';

const MAX_AUDIT_LOGS = 2000;

export interface AuditLogActor {
  id?: string;
  name: string;
  email?: string;
}

export interface AuditLogLocation {
  buildingId?: string;
  floorId?: string;
  areaId?: string;
  areaIds?: string[];
}

export interface AuditLogEntry {
  id: string;
  createdAt: Date;
  module: string;
  action: string;
  description: string;
  actor: AuditLogActor;
  location?: AuditLogLocation;
  metadata?: Record<string, string | number | boolean | null>;
}

type RawAuditLogEntry = Omit<AuditLogEntry, 'createdAt'> & {
  createdAt: string;
};

interface AuthUserSnapshot {
  id?: string;
  name?: string;
  email?: string;
}

const readStorage = (key: string) => {
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

const parseRawLogs = (raw: string | null): RawAuditLogEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RawAuditLogEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => !!entry?.id && !!entry?.createdAt && !!entry?.action);
  } catch {
    return [];
  }
};

const toAuditLogEntry = (raw: RawAuditLogEntry): AuditLogEntry => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
});

const toRawAuditLogEntry = (entry: AuditLogEntry): RawAuditLogEntry => ({
  ...entry,
  createdAt: entry.createdAt.toISOString(),
});

const buildUniqueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `audit-${crypto.randomUUID()}`;
  }

  return `audit-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const readCurrentActor = (): AuditLogActor => {
  const fallback: AuditLogActor = {
    name: 'System',
  };

  const raw = readStorage('auth_user');
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUserSnapshot;
    return {
      id: parsed.id,
      name: parsed.name?.trim() || fallback.name,
      email: parsed.email,
    };
  } catch {
    return fallback;
  }
};

export const loadAuditLogs = (): AuditLogEntry[] => {
  const rawLogs = parseRawLogs(readStorage(AUDIT_LOGS_STORAGE_KEY));

  return rawLogs
    .map(toAuditLogEntry)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
};

const persistAuditLogs = (logs: AuditLogEntry[]) => {
  writeStorage(
    AUDIT_LOGS_STORAGE_KEY,
    JSON.stringify(logs.slice(0, MAX_AUDIT_LOGS).map(toRawAuditLogEntry)),
  );

  window.dispatchEvent(new CustomEvent(AUDIT_LOGS_UPDATED_EVENT));
};

export const logAuditEvent = (event: {
  module: string;
  action: string;
  description: string;
  location?: AuditLogLocation;
  actor?: Partial<AuditLogActor>;
  metadata?: Record<string, string | number | boolean | null>;
}): AuditLogEntry => {
  const actorSnapshot = readCurrentActor();
  const actor: AuditLogActor = {
    id: event.actor?.id ?? actorSnapshot.id,
    name: event.actor?.name ?? actorSnapshot.name,
    email: event.actor?.email ?? actorSnapshot.email,
  };

  const nextEntry: AuditLogEntry = {
    id: buildUniqueId(),
    createdAt: new Date(),
    module: event.module,
    action: event.action,
    description: event.description,
    actor,
    location: event.location,
    metadata: event.metadata,
  };

  const existing = loadAuditLogs();
  persistAuditLogs([nextEntry, ...existing]);

  return nextEntry;
};

export const canViewAuditLogByScope = (
  permission: UserPermission | null,
  scopedAreaIds: Set<string>,
  log: AuditLogEntry,
): boolean => {
  if (!permission) {
    return false;
  }

  if (permission.role === 'super_admin') {
    return true;
  }

  if (!log.location) {
    return false;
  }

  if (log.location.areaId && scopedAreaIds.has(log.location.areaId)) {
    return true;
  }

  if (Array.isArray(log.location.areaIds) && log.location.areaIds.some((areaId) => scopedAreaIds.has(areaId))) {
    return true;
  }

  if (log.location.floorId && permission.primaryFloorId && log.location.floorId === permission.primaryFloorId) {
    return true;
  }

  if (log.location.buildingId && permission.buildingAccess.includes(log.location.buildingId)) {
    return true;
  }

  return false;
};
