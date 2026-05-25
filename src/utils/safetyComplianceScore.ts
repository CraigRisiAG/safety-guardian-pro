import { parseISO, isBefore, subMonths } from 'date-fns';
import {
  AdminSettings,
  ALL_SAFETY_ROLES,
  ALL_WORK_DAYS,
  DEFAULT_COMPLIANCE_SCORING_SETTINGS,
} from '@/types/admin';
import { CompletedCheckRecord } from '@/types/compliance';
import { DrillRecord } from '@/types/safety';
import { loadMissedComplianceRecords } from '@/lib/complianceMonitoring';

const COMPLETED_CHECKS_STORAGE_KEY = 'safeguard_completed_checks';
const DRILL_RECORDS_STORAGE_KEY = 'drill_records';

export interface SafetyComplianceBreakdown {
  score: number;
  checksScore: number;
  officialCoverageScore: number;
  drillSuccessScore: number;
  areaReportCoverageScore: number;
  passCount: number;
  partialCount: number;
  failCount: number;
  totalCompleted: number;
  totalDrills: number;
  successfulDrills: number;
  totalAreas: number;
  coveredAreasInPeriod: number;
  areaReportPeriod: 'monthly' | 'quarterly';
  overdueCount: number;
  missedCount: number;
  requiredOfficialsTotal: number;
  missingOfficialsTotal: number;
  weightsApplied: {
    checksQuality: number;
    officialCoverage: number;
    drillSuccess: number;
    areaReportCoverage: number;
  };
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

const loadDrillRecords = (): DrillRecord[] => {
  try {
    const stored = localStorage.getItem(DRILL_RECORDS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        const record = item as Partial<DrillRecord> & {
          completedAt?: string | Date;
          startedAt?: string | Date;
        };
        if (!record.id || !record.drillId) {
          return null;
        }

        return {
          ...record,
          startedAt:
            typeof record.startedAt === 'string'
              ? parseISO(record.startedAt)
              : new Date(record.startedAt ?? new Date()),
          completedAt:
            typeof record.completedAt === 'string'
              ? parseISO(record.completedAt)
              : new Date(record.completedAt ?? new Date()),
        } as DrillRecord;
      })
      .filter((record): record is DrillRecord => record !== null);
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
  const missedRecords = loadMissedComplianceRecords().filter((entry) => entry.status === 'incomplete');
  const drillRecords = loadDrillRecords();
  const scoring = {
    ...DEFAULT_COMPLIANCE_SCORING_SETTINGS,
    ...(settings.complianceScoring ?? {}),
    weights: {
      ...DEFAULT_COMPLIANCE_SCORING_SETTINGS.weights,
      ...(settings.complianceScoring?.weights ?? {}),
    },
  };

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
  const missedCount = missedRecords.length;

  // Checks score: weighted pass-rate with overdue penalty
  const weightedScore = passCount * 1 + partialCount * scoring.checksPartialCredit;
  const penaltyCount = overdueCount + missedCount;
  const overduePenalty = penaltyCount * scoring.overduePenaltyPerCheck;
  const denominator = totalCompleted + penaltyCount;
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

  const totalDrills = drillRecords.length;
  const successfulDrills = drillRecords.filter((record) => {
    const total = record.checkInStats?.total ?? 0;
    if (total <= 0) {
      return true;
    }

    const accounted = Math.max(0, total - (record.checkInStats?.pending ?? 0));
    const accountedPercent = (accounted / total) * 100;
    return accountedPercent >= scoring.drillFailureThresholdPercent;
  }).length;
  const drillSuccessScore =
    totalDrills > 0 ? Math.round((successfulDrills / totalDrills) * 100) : 100;

  const totalAreas = settings.buildings.reduce(
    (sum, building) => sum + building.floors.reduce((floorSum, floor) => floorSum + floor.areas.length, 0),
    0,
  );
  const periodStart = subMonths(new Date(), scoring.areaReportPeriod === 'quarterly' ? 3 : 1);
  const coveredAreas = new Set(
    records
      .filter((record) => record.completedAt >= periodStart)
      .map((record) => record.areaId)
      .filter((areaId): areaId is string => typeof areaId === 'string' && areaId.length > 0),
  );
  const coveredAreasInPeriod = coveredAreas.size;
  const areaReportCoverageScore =
    totalAreas > 0 ? Math.round((coveredAreasInPeriod / totalAreas) * 100) : 100;

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
  const requiredDays = settings.healthOfficialsRequiredDays?.length
    ? settings.healthOfficialsRequiredDays
    : ALL_WORK_DAYS;

  areaDefinitions.forEach((areaInfo) => {
    requiredDays.forEach((day) => {
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

  const rawWeightTotal =
    scoring.weights.checksQuality +
    scoring.weights.officialCoverage +
    scoring.weights.drillSuccess +
    scoring.weights.areaReportCoverage;
  const effectiveWeightTotal = rawWeightTotal > 0 ? rawWeightTotal : 1;
  const normalizedWeights = {
    checksQuality: scoring.weights.checksQuality / effectiveWeightTotal,
    officialCoverage: scoring.weights.officialCoverage / effectiveWeightTotal,
    drillSuccess: scoring.weights.drillSuccess / effectiveWeightTotal,
    areaReportCoverage: scoring.weights.areaReportCoverage / effectiveWeightTotal,
  };

  const score = Math.round(
    checksScore * normalizedWeights.checksQuality +
    officialCoverageScore * normalizedWeights.officialCoverage +
    drillSuccessScore * normalizedWeights.drillSuccess +
    areaReportCoverageScore * normalizedWeights.areaReportCoverage,
  );

  return {
    score,
    checksScore,
    officialCoverageScore,
    drillSuccessScore,
    areaReportCoverageScore,
    passCount,
    partialCount,
    failCount,
    totalCompleted,
    totalDrills,
    successfulDrills,
    totalAreas,
    coveredAreasInPeriod,
    areaReportPeriod: scoring.areaReportPeriod,
    overdueCount,
    missedCount,
    requiredOfficialsTotal,
    missingOfficialsTotal,
    weightsApplied: {
      checksQuality: scoring.weights.checksQuality,
      officialCoverage: scoring.weights.officialCoverage,
      drillSuccess: scoring.weights.drillSuccess,
      areaReportCoverage: scoring.weights.areaReportCoverage,
    },
  };
}
