import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CompletedCheckRecord, CHECK_TYPE_LABELS } from '@/types/compliance';
import { PendingChecksDialog } from './PendingChecksDialog';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore } from 'date-fns';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import { computeSafetyComplianceBreakdown } from '@/utils/safetyComplianceScore';
import { resolveCheckAssignedUsers } from '@/utils/complianceAssignments';
import { loadMissedComplianceRecords } from '@/lib/complianceMonitoring';
import {
  ALL_SAFETY_ROLES,
  ComplianceCheck,
  UserPermission,
} from '@/types/admin';

const STORAGE_KEY = 'safeguard_completed_checks';

interface ComplianceStatsWidgetProps {
  onStartCheck?: (check: ComplianceCheck, onBehalfOf?: UserPermission) => void;
}

export function ComplianceStatsWidget({ onStartCheck }: ComplianceStatsWidgetProps) {
  const navigate = useNavigate();
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingDialogFilter, setPendingDialogFilter] = useState<'this_week' | 'overdue' | 'all'>('all');
  const [pendingDialogCategoryFilter, setPendingDialogCategoryFilter] = useState<'all' | 'non_training' | 'training'>('non_training');

  // Determine if current user is admin/super_admin
  const currentUserPermission = useMemo(() => {
    if (!user) return null;
    return settings.userPermissions.find(
      p => p.email.toLowerCase() === user.email.toLowerCase() || p.userId === user.id
    );
  }, [user, settings.userPermissions]);

  const isAdmin = currentUserPermission?.role === 'admin' || currentUserPermission?.role === 'super_admin';
  const isSuperAdmin = currentUserPermission?.role === 'super_admin';
  
  const stats = useMemo(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allRecords: CompletedCheckRecord[] = stored
      ? (() => {
          try {
            const parsed = JSON.parse(stored) as unknown;
            if (!Array.isArray(parsed)) {
              return [];
            }

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
        })()
      : [];

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Checks completed this week
    const thisWeekRecords = allRecords.filter(r => 
      isWithinInterval(r.completedAt, { start: weekStart, end: weekEnd })
    );

    // Pass/fail/partial counts
    const passCount = allRecords.filter(r => r.status === 'pass').length;
    const failCount = allRecords.filter(r => r.status === 'fail').length;
    const partialCount = allRecords.filter(r => r.status === 'partial').length;
    const totalChecks = allRecords.length;
    const passRate = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

    // By check type this week
    const byType: Record<CompletedCheckRecord['checkType'], number> = {
      evacuation: 0,
      fire: 0,
      office: 0,
      first_aid: 0,
      training: 0,
    };
    thisWeekRecords.forEach(r => {
      byType[r.checkType]++;
    });

    // Calculate pending checks for the current user (or all for admins)
    const userPendingChecks = settings.complianceChecks.filter(check => {
      if (check.status === 'completed') return false;
      const assignedUsers = resolveCheckAssignedUsers(check, settings.userPermissions, settings.buildings);
      
      // Only super admins see all checks
      if (isSuperAdmin) return true;
      
      // Regular users only see their assigned checks
      if (!currentUserPermission) return false;
      return assignedUsers.some((entry) =>
        entry.id === currentUserPermission.id || entry.userId === currentUserPermission.userId,
      );
    });

    const missedRecords = loadMissedComplianceRecords().filter((entry) => entry.status === 'incomplete');
    const visibleMissedCount = isSuperAdmin
      ? missedRecords.length
      : missedRecords.filter((record) =>
          !!currentUserPermission && (
            record.assignedUserIds.includes(currentUserPermission.id) ||
            record.assignedUserIds.includes(currentUserPermission.userId)
          ),
        ).length;

    const userPendingTraining = userPendingChecks.filter((check) => check.category === 'training');
    const userPendingNonTraining = userPendingChecks.filter((check) => check.category !== 'training');

    // This week's pending checks (excluding training)
    const thisWeekPending = userPendingNonTraining.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd }) || isBefore(dueDate, now);
    });

    // Calculate overdue checks excluding training
    const overdueChecks = userPendingNonTraining.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isBefore(dueDate, now);
    });

    // Calculate overdue training separately
    const overdueTraining = userPendingTraining.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isBefore(dueDate, now);
    });

    const areaDefinitions = settings.buildings.flatMap((building) =>
      building.floors.flatMap((floor) =>
        floor.areas.map((area) => ({
          areaId: area.id,
          areaName: area.name,
          floorName: floor.name,
          buildingName: building.name,
          expectedHeadcount: area.expectedHeadcount,
        })),
      ),
    );

    const roleGapItems = areaDefinitions.flatMap((areaInfo) =>
      (settings.healthOfficialsRequiredDays?.length ? settings.healthOfficialsRequiredDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).flatMap((day) => {
        const usersInAreaForDay = settings.userPermissions.filter(
          (person) => person.primaryAreaId === areaInfo.areaId && person.workDays.includes(day),
        );

        const headcount = areaInfo.expectedHeadcount ?? usersInAreaForDay.length;
        const requiredPerRole = Math.max(1, Math.ceil(Math.max(headcount, 1) / 100));

        return ALL_SAFETY_ROLES.map((role) => {
          const assignedCount = usersInAreaForDay.filter((person) => person.safetyRoles.includes(role)).length;
          const gapCount = Math.max(requiredPerRole - assignedCount, 0);

          return {
            ...areaInfo,
            day,
            role,
            assignedCount,
            requiredCount: requiredPerRole,
            gapCount,
          };
        }).filter((item) => item.gapCount > 0);
      }),
    );

    const requiredOfficialsTotal = areaDefinitions.reduce((total, areaInfo) => {
      const requiredDays = settings.healthOfficialsRequiredDays?.length
        ? settings.healthOfficialsRequiredDays
        : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      return total + requiredDays.reduce((dayTotal, day) => {
        const usersInAreaForDay = settings.userPermissions.filter(
          (person) => person.primaryAreaId === areaInfo.areaId && person.workDays.includes(day),
        );
        const headcount = areaInfo.expectedHeadcount ?? usersInAreaForDay.length;
        const requiredPerRole = Math.max(1, Math.ceil(Math.max(headcount, 1) / 100));
        return dayTotal + requiredPerRole * ALL_SAFETY_ROLES.length;
      }, 0);
    }, 0);

    const missingOfficialsTotal = roleGapItems.reduce((sum, item) => sum + item.gapCount, 0);
    // Use the shared compliance score so the dashboard StatCard and this
    // widget always show the same number.
    const breakdown = computeSafetyComplianceBreakdown(settings);
    const officialCoverageScore = breakdown.officialCoverageScore;
    const safetyComplianceScore = breakdown.score;
    const drillSuccessScore = breakdown.drillSuccessScore;
    const areaReportCoverageScore = breakdown.areaReportCoverageScore;
    const trainingNotDoneCount = breakdown.trainingNotDoneCount;

    return {
      thisWeek: thisWeekRecords.length,
      thisWeekPending: thisWeekPending.length,
      total: totalChecks,
      passCount,
      failCount,
      partialCount,
      passRate,
      byType,
      overdueCount: overdueChecks.length,
      overdueTrainingCount: overdueTraining.length,
      missedCount: visibleMissedCount,
      overdueChecks,
      overdueTraining,
      roleGapItems,
      missingOfficialsTotal,
      officialCoverageScore,
      safetyComplianceScore,
      drillSuccessScore,
      areaReportCoverageScore,
      trainingNotDoneCount,
    };
  }, [settings, currentUserPermission, isSuperAdmin]);

  const handleOpenPendingDialog = (
    filter: 'this_week' | 'overdue' | 'all',
    categoryFilter: 'all' | 'non_training' | 'training' = 'non_training',
  ) => {
    setPendingDialogFilter(filter);
    setPendingDialogCategoryFilter(categoryFilter);
    setPendingDialogOpen(true);
  };

  const handleStartCheck = (check: ComplianceCheck, onBehalfOf?: UserPermission) => {
    if (onStartCheck) {
      onStartCheck(check, onBehalfOf);
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* This Week Summary - Clickable */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOpenPendingDialog('this_week', 'non_training')}
              className="bg-primary/10 hover:bg-primary/20 rounded-lg p-3 text-center transition-all cursor-pointer hover:shadow-md hover:shadow-primary/10"
            >
              <div className="text-2xl font-bold text-primary">{stats.thisWeekPending}</div>
              <div className="text-xs text-muted-foreground">Checks Due This Week</div>
            </button>
            <button
              onClick={() => handleOpenPendingDialog('overdue', 'non_training')}
              className={`rounded-lg p-3 text-center transition-all cursor-pointer hover:shadow-md ${
                stats.overdueCount > 0 
                  ? 'bg-emergency-muted hover:bg-emergency-muted/80 hover:shadow-emergency/10' 
                  : 'bg-safe-muted hover:bg-safe-muted/80 hover:shadow-safe/10'
              }`}
            >
              <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-emergency' : 'text-safe'}`}>
                {stats.overdueCount}
              </div>
              <div className="text-xs text-muted-foreground">Overdue Checks</div>
            </button>
          </div>

          {stats.missedCount > 0 && (
            <div className="text-xs text-emergency bg-emergency-muted/40 border border-emergency/30 rounded px-2 py-1">
              {stats.missedCount} missed check{stats.missedCount === 1 ? '' : 's'} have been logged as incomplete.
            </div>
          )}

          {stats.trainingNotDoneCount > 0 && (
            <button
              onClick={() => handleOpenPendingDialog('overdue', 'training')}
              className="w-full text-left text-xs text-warning bg-warning-muted/40 border border-warning/30 rounded px-2 py-1 hover:bg-warning-muted/60 transition-colors"
            >
              {stats.trainingNotDoneCount} training item{stats.trainingNotDoneCount === 1 ? '' : 's'} marked Not Done are actively penalizing compliance score.
            </button>
          )}

          {/* Pass/Fail Rate */}
          <button
            onClick={() => handleOpenPendingDialog('overdue', 'non_training')}
            className="w-full text-left space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Safety Compliance Score</span>
              <span className="font-medium">{stats.safetyComplianceScore}%</span>
            </div>
            <Progress value={stats.safetyComplianceScore} className="h-2" />
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-safe-muted text-safe">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Checks {stats.passRate}%
              </Badge>
              <Badge variant="outline" className="bg-info-muted text-info">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Officials {stats.officialCoverageScore}%
              </Badge>
              <Badge variant="outline" className="bg-warning-muted text-warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Drills {stats.drillSuccessScore}%
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Areas {stats.areaReportCoverageScore}%
              </Badge>
            </div>
          </button>

          {/* Health Officials Gaps */}
          <button
            onClick={() => navigate('/health-official-gaps')}
            className={`w-full text-left rounded-lg p-3 transition-all cursor-pointer border ${
              stats.missingOfficialsTotal > 0
                ? 'bg-warning-muted/50 hover:bg-warning-muted/70 border-warning/30'
                : 'bg-safe-muted/50 hover:bg-safe-muted/70 border-safe/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Health Official Gaps</span>
              <Badge variant="outline" className={stats.missingOfficialsTotal > 0 ? 'bg-emergency-muted text-emergency' : 'bg-safe-muted text-safe'}>
                {stats.missingOfficialsTotal}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Every area/day requires each role, plus +1 per 100 people in that area.
            </div>
          </button>

          {/* By Check Type */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Completed This Week</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(CHECK_TYPE_LABELS) as CompletedCheckRecord['checkType'][]).map(type => (
                <div key={type} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <span className="truncate">{CHECK_TYPE_LABELS[type].replace(' Check', '')}</span>
                  <Badge variant="secondary" className="ml-1">{stats.byType[type]}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Warning */}
          {stats.overdueCount > 0 && (
            <button
              onClick={() => handleOpenPendingDialog('overdue', 'non_training')}
              className="w-full text-left bg-emergency-muted/50 hover:bg-emergency-muted/70 border border-emergency/30 rounded-lg p-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emergency text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" />
                {stats.overdueCount} Overdue Check{stats.overdueCount > 1 ? 's' : ''}
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {stats.overdueChecks.slice(0, 3).map(check => (
                  <li key={check.id} className="truncate">• {check.name}</li>
                ))}
                {stats.overdueCount > 3 && (
                  <li className="text-emergency">+ {stats.overdueCount - 3} more</li>
                )}
              </ul>
            </button>
          )}

          {stats.overdueTrainingCount > 0 && (
            <button
              onClick={() => handleOpenPendingDialog('overdue', 'training')}
              className="w-full text-left bg-warning-muted/50 hover:bg-warning-muted/70 border border-warning/30 rounded-lg p-3 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 text-warning text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" />
                {stats.overdueTrainingCount} Overdue Training Item{stats.overdueTrainingCount > 1 ? 's' : ''}
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {stats.overdueTraining.slice(0, 3).map((check) => (
                  <li key={check.id} className="truncate">• {check.name}</li>
                ))}
                {stats.overdueTrainingCount > 3 && (
                  <li className="text-warning">+ {stats.overdueTrainingCount - 3} more</li>
                )}
              </ul>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Pending Checks Dialog */}
      <PendingChecksDialog
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
        initialFilter={pendingDialogFilter}
        categoryFilter={pendingDialogCategoryFilter}
        onStartCheck={handleStartCheck}
      />
    </>
  );
}
