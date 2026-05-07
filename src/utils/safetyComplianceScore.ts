import { parseISO, isBefore } from 'date-fns';
import {
  AdminSettings,
  ALL_SAFETY_ROLES,
  ALL_WORK_DAYS,
} from '@/types/admin';
import { CompletedCheckRecord } from '@/types/compliance';

const COMPLETED_CHECKS_STORAGE_KEY = 'safeguard_completed_checks';

export interface SafetyComplianceBreakdown {
  score: number;
  checksScore: number;
  officialCoverageScore: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  totalCompleted: number;
  overdueCount: number;
  requiredOfficialsTotal: number;
  missingOfficialsTotal: number;
}

const loadCompletedRecords = (): CompletedCheckRecord[] => {
  try {
    const stored = localStorage.getItem(COMPLETED_CHECKS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const record = item as Partial<CompletedCheckRecord> & { completedAt?: string | Date };
      return {
        ...record,
        completedAt:
          typeof record.completedAt === 'string'
            ? parseISO(record.completedAt)
            : new Date(record.completedAt ?? new Date()),
      } as CompletedCheckRecord;
    });
  } catch {
    return [];
  }
};

/**
 * Unified Safety Compliance score that combines:
 *  - quality of completed compliance checks (pass / partial / fail)
 *  - overdue scheduled checks (penalty)
 *  - coverage of required health & safety officials per area / work day
 *
 * The same score is shown on the dashboard StatCard and the
 * Compliance Overview widget so both stay consistent.
 */
export function computeSafetyComplianceBreakdown(
  settings: AdminSettings,
): SafetyComplianceBreakdown {
  const records = loadCompletedRecords();

  const passCount = records.filter((r) => r.status === 'pass').length;
  const partialCount = records.filter((r) => r.status === 'partial').length;
  const failCount = records.filter((r) => r.status === 'fail').length;
  const totalCompleted = records.length;

  const now = new Date();
  const overdueChecks = settings.complianceChecks.filter((c) => {
    if (c.status === 'completed') return false;
    return isBefore(new Date(c.nextDue), now);
  });
  const overdueCount = overdueChecks.length;

  // Checks score: weighted pass-rate with overdue penalty
  const weightedScore = passCount * 1 + partialCount * 0.5;
  const overduePenalty = overdueCount * 0.5;
  const denominator = totalCompleted + overdueCount;
  const checksScore =
    denominator > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((weightedScore - overduePenalty) / denominator) * 100),
          ),
        )
      : 100;

  // Health & safety official coverage
  const areaDefinitions = settings.buildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.areas.map((area) => ({
        areaId: area.id,
        expectedHeadcount: area.expectedHeadcount,
      })),
    ),
  );

  let requiredOfficialsTotal = 0;
  let missingOfficialsTotal = 0;

  areaDefinitions.forEach((areaInfo) => {
    ALL_WORK_DAYS.forEach((day) => {
      const usersInAreaForDay = settings.userPermissions.filter(
        (person) =>
          person.primaryAreaId === areaInfo.areaId && person.workDays.includes(day),
      );
      const headcount = areaInfo.expectedHeadcount ?? usersInAreaForDay.length;
      const requiredPerRole = Math.max(1, Math.ceil(Math.max(headcount, 1) / 100));

      ALL_SAFETY_ROLES.forEach((role) => {
        const assignedCount = usersInAreaForDay.filter((person) =>
          person.safetyRoles.includes(role),
        ).length;
        const gapCount = Math.max(requiredPerRole - assignedCount, 0);
        requiredOfficialsTotal += requiredPerRole;
        missingOfficialsTotal += gapCount;
      });
    });
  });

  const officialCoverageScore =
    requiredOfficialsTotal > 0
      ? Math.max(
          0,
          Math.round(
            ((requiredOfficialsTotal - missingOfficialsTotal) /
              requiredOfficialsTotal) *
              100,
          ),
        )
      : 100;

  // Combined: 70% checks quality, 30% officials coverage — matches the
  // existing Compliance Overview widget weighting.
  const score = Math.round(checksScore * 0.7 + officialCoverageScore * 0.3);

  return {
    score,
    checksScore,
    officialCoverageScore,
    passCount,
    partialCount,
    failCount,
    totalCompleted,
    overdueCount,
    requiredOfficialsTotal,
    missingOfficialsTotal,
  };
}
