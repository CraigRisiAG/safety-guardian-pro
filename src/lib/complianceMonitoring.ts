import { isBefore } from 'date-fns';
import { AdminSettings, ComplianceCheck } from '@/types/admin';
import { resolveCheckAssignedUsers } from '@/utils/complianceAssignments';
import { notifyComplianceChecksMissed } from '@/lib/notifications';
import { getNextComplianceDueDate } from '@/utils/complianceRecurrence';

export const MISSED_COMPLIANCE_RECORDS_STORAGE_KEY = 'safeguard_missed_compliance_records';

export interface MissedComplianceRecord {
  id: string;
  checkId: string;
  checkName: string;
  dueAt: Date;
  loggedAt: Date;
  category: string;
  buildingIds: string[];
  floorIds: string[];
  areaIds: string[];
  assignedUserIds: string[];
  assignedSafetyRoles: string[];
  status: 'incomplete' | 'completed';
  resolvedAt?: Date;
}

interface RawMissedComplianceRecord extends Omit<MissedComplianceRecord, 'dueAt' | 'loggedAt' | 'resolvedAt'> {
  dueAt: string;
  loggedAt: string;
  resolvedAt?: string;
}

const toDueKey = (checkId: string, dueAt: Date) => `${checkId}:${dueAt.toISOString()}`;

const parseMissedRecords = (raw: string | null): MissedComplianceRecord[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as RawMissedComplianceRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => ({
      ...entry,
      dueAt: new Date(entry.dueAt),
      loggedAt: new Date(entry.loggedAt),
      resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt) : undefined,
    }));
  } catch {
    return [];
  }
};

const persistMissedRecords = (records: MissedComplianceRecord[]) => {
  const normalized: RawMissedComplianceRecord[] = records.map((entry) => ({
    ...entry,
    dueAt: entry.dueAt.toISOString(),
    loggedAt: entry.loggedAt.toISOString(),
    resolvedAt: entry.resolvedAt?.toISOString(),
  }));

  localStorage.setItem(MISSED_COMPLIANCE_RECORDS_STORAGE_KEY, JSON.stringify(normalized));
};

export const loadMissedComplianceRecords = (): MissedComplianceRecord[] => {
  return parseMissedRecords(localStorage.getItem(MISSED_COMPLIANCE_RECORDS_STORAGE_KEY)).sort(
    (left, right) => right.dueAt.getTime() - left.dueAt.getTime(),
  );
};

export const completeMissedComplianceForCheck = (checkId: string) => {
  const existingRecords = loadMissedComplianceRecords();
  const target = existingRecords.find(
    (entry) => entry.checkId === checkId && entry.status === 'incomplete',
  );

  if (!target) {
    return false;
  }

  const updated = existingRecords.map((entry) => {
    if (entry.id !== target.id) {
      return entry;
    }

    return {
      ...entry,
      status: 'completed' as const,
      resolvedAt: new Date(),
    };
  });

  persistMissedRecords(updated);
  return true;
};

export const refreshMissedComplianceAssignments = (settings: AdminSettings): number => {
  const existingRecords = loadMissedComplianceRecords();
  if (existingRecords.length === 0) {
    return 0;
  }

  const checksById = new Map(settings.complianceChecks.map((check) => [check.id, check]));
  let changedCount = 0;

  const nextRecords = existingRecords.map((record) => {
    const check = checksById.get(record.checkId);
    if (!check) {
      return record;
    }

    const resolvedUsers = resolveCheckAssignedUsers(check, settings.userPermissions, settings.buildings);
    const nextAssignedUserIds = resolvedUsers.map((entry) => entry.id).sort();
    const currentAssignedUserIds = [...record.assignedUserIds].sort();
    const nextAssignedSafetyRoles = [...(check.assignedSafetyRoles ?? [])].sort();
    const currentAssignedSafetyRoles = [...record.assignedSafetyRoles].sort();

    const usersChanged = JSON.stringify(nextAssignedUserIds) !== JSON.stringify(currentAssignedUserIds);
    const rolesChanged = JSON.stringify(nextAssignedSafetyRoles) !== JSON.stringify(currentAssignedSafetyRoles);

    if (!usersChanged && !rolesChanged) {
      return record;
    }

    changedCount += 1;
    return {
      ...record,
      assignedUserIds: nextAssignedUserIds,
      assignedSafetyRoles: nextAssignedSafetyRoles,
    };
  });

  if (changedCount > 0) {
    persistMissedRecords(nextRecords);
  }

  return changedCount;
};

interface ProcessResult {
  loggedCount: number;
  notifiedCount: number;
}

interface ProcessInput {
  settings: AdminSettings;
  updateComplianceCheck: (id: string, updates: Partial<ComplianceCheck>) => void;
}

const MAX_BACKFILL_CYCLES = 600;

export const processOverdueComplianceChecks = ({
  settings,
  updateComplianceCheck,
}: ProcessInput): ProcessResult => {
  const now = new Date();
  const existingRecords = loadMissedComplianceRecords();
  const existingKeys = new Set(existingRecords.map((entry) => toDueKey(entry.checkId, entry.dueAt)));
  const newRecords: MissedComplianceRecord[] = [];
  const recordsToNotify: MissedComplianceRecord[] = [];

  settings.complianceChecks.forEach((check) => {
    if (check.status === 'completed') {
      return;
    }

    const dueCursor = new Date(check.nextDue);
    const recurrenceEnded = check.endDate ? isBefore(new Date(check.endDate), dueCursor) : false;
    if (recurrenceEnded || !isBefore(dueCursor, now)) {
      return;
    }

    const assignedUsers = resolveCheckAssignedUsers(check, settings.userPermissions, settings.buildings);
    const assignedUserIds = assignedUsers.map((entry) => entry.id);

    if (!check.isRecurring || check.recurrencePattern === 'none') {
      const key = toDueKey(check.id, dueCursor);
      if (!existingKeys.has(key)) {
        const record: MissedComplianceRecord = {
          id: `missed-${check.id}-${dueCursor.getTime()}`,
          checkId: check.id,
          checkName: check.name,
          dueAt: dueCursor,
          loggedAt: now,
          category: check.category,
          buildingIds: check.buildingIds ?? [],
          floorIds: check.floorIds ?? [],
          areaIds: check.areaIds ?? [],
          assignedUserIds,
          assignedSafetyRoles: check.assignedSafetyRoles ?? [],
          status: 'incomplete',
        };
        newRecords.push(record);
        recordsToNotify.push(record);
        existingKeys.add(key);
      }

      if (check.status !== 'overdue') {
        updateComplianceCheck(check.id, {
          status: 'overdue',
          lastMissedDueAt: dueCursor,
        });
      }
      return;
    }

    let lastMissedDueAt: Date | undefined;
    let nextDue = dueCursor;
    let loopGuard = 0;

    while (isBefore(nextDue, now) && loopGuard < MAX_BACKFILL_CYCLES) {
      const key = toDueKey(check.id, nextDue);
      if (!existingKeys.has(key)) {
        const record: MissedComplianceRecord = {
          id: `missed-${check.id}-${nextDue.getTime()}`,
          checkId: check.id,
          checkName: check.name,
          dueAt: nextDue,
          loggedAt: now,
          category: check.category,
          buildingIds: check.buildingIds ?? [],
          floorIds: check.floorIds ?? [],
          areaIds: check.areaIds ?? [],
          assignedUserIds,
          assignedSafetyRoles: check.assignedSafetyRoles ?? [],
          status: 'incomplete',
        };
        newRecords.push(record);
        recordsToNotify.push(record);
        existingKeys.add(key);
      }

      lastMissedDueAt = nextDue;
      nextDue = getNextComplianceDueDate(check, nextDue);
      loopGuard += 1;

      if (check.endDate && isBefore(new Date(check.endDate), nextDue)) {
        break;
      }
    }

    const shouldUpdateDue = nextDue.getTime() !== new Date(check.nextDue).getTime();
    if (shouldUpdateDue || check.status !== 'pending') {
      updateComplianceCheck(check.id, {
        status: 'pending',
        nextDue,
        lastMissedDueAt,
      });
    }
  });

  if (newRecords.length > 0) {
    persistMissedRecords([...newRecords, ...existingRecords]);
  }

  let notifiedCount = 0;
  if (recordsToNotify.length > 0) {
    const summary = notifyComplianceChecksMissed({
      missedChecks: recordsToNotify,
      userPermissions: settings.userPermissions,
    });
    notifiedCount = summary.total;
  }

  return {
    loggedCount: newRecords.length,
    notifiedCount,
  };
};
