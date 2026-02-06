import { useState, useMemo } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CompletedCheckRecord, CHECK_TYPE_LABELS } from '@/types/compliance';
import { PendingChecksDialog } from './PendingChecksDialog';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, isBefore } from 'date-fns';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import { ComplianceCheck, UserPermission } from '@/types/admin';

const STORAGE_KEY = 'safeguard_completed_checks';

interface ComplianceStatsWidgetProps {
  onStartCheck?: (check: ComplianceCheck, onBehalfOf?: UserPermission) => void;
}

export function ComplianceStatsWidget({ onStartCheck }: ComplianceStatsWidgetProps) {
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingDialogFilter, setPendingDialogFilter] = useState<'this_week' | 'overdue' | 'all'>('all');

  // Determine if current user is admin/super_admin
  const currentUserPermission = useMemo(() => {
    if (!user) return null;
    return settings.userPermissions.find(
      p => p.email.toLowerCase() === user.email.toLowerCase() || p.userId === user.id
    );
  }, [user, settings.userPermissions]);

  const isAdmin = currentUserPermission?.role === 'admin' || currentUserPermission?.role === 'super_admin';
  
  const stats = useMemo(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allRecords: CompletedCheckRecord[] = stored 
      ? JSON.parse(stored).map((r: any) => ({
          ...r,
          completedAt: typeof r.completedAt === 'string' ? parseISO(r.completedAt) : new Date(r.completedAt)
        }))
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

    // By check type this week
    const byType: Record<CompletedCheckRecord['checkType'], number> = {
      evacuation: 0,
      fire: 0,
      office: 0,
      first_aid: 0,
    };
    thisWeekRecords.forEach(r => {
      byType[r.checkType]++;
    });

    // Calculate pending checks for the current user (or all for admins)
    const userPendingChecks = settings.complianceChecks.filter(check => {
      if (check.status === 'completed') return false;
      
      // Admins see all checks
      if (isAdmin) return true;
      
      // Regular users only see their assigned checks
      if (!currentUserPermission) return false;
      return check.assignedUsers?.includes(currentUserPermission.id) || 
             check.assignedTo === currentUserPermission.id;
    });

    // This week's pending checks
    const thisWeekPending = userPendingChecks.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isWithinInterval(dueDate, { start: weekStart, end: weekEnd }) || isBefore(dueDate, now);
    });

    // Calculate overdue scheduled checks
    const overdueChecks = userPendingChecks.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isBefore(dueDate, now);
    });

    return {
      thisWeek: thisWeekRecords.length,
      thisWeekPending: thisWeekPending.length,
      total: totalChecks,
      passCount,
      failCount,
      partialCount,
      passRate: totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0,
      byType,
      overdueCount: overdueChecks.length,
      overdueChecks,
    };
  }, [settings.complianceChecks, currentUserPermission, isAdmin]);

  const handleOpenPendingDialog = (filter: 'this_week' | 'overdue' | 'all') => {
    setPendingDialogFilter(filter);
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
              onClick={() => handleOpenPendingDialog('this_week')}
              className="bg-primary/10 hover:bg-primary/20 rounded-lg p-3 text-center transition-all cursor-pointer hover:shadow-md hover:shadow-primary/10"
            >
              <div className="text-2xl font-bold text-primary">{stats.thisWeekPending}</div>
              <div className="text-xs text-muted-foreground">Due This Week</div>
            </button>
            <button
              onClick={() => handleOpenPendingDialog('overdue')}
              className={`rounded-lg p-3 text-center transition-all cursor-pointer hover:shadow-md ${
                stats.overdueCount > 0 
                  ? 'bg-emergency-muted hover:bg-emergency-muted/80 hover:shadow-emergency/10' 
                  : 'bg-safe-muted hover:bg-safe-muted/80 hover:shadow-safe/10'
              }`}
            >
              <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-emergency' : 'text-safe'}`}>
                {stats.overdueCount}
              </div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </button>
          </div>

          {/* Pass/Fail Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pass Rate</span>
              <span className="font-medium">{stats.passRate}%</span>
            </div>
            <Progress value={stats.passRate} className="h-2" />
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="bg-safe-muted text-safe">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {stats.passCount} Pass
              </Badge>
              <Badge variant="outline" className="bg-warning-muted text-warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {stats.partialCount} Partial
              </Badge>
              <Badge variant="outline" className="bg-emergency-muted text-emergency">
                <XCircle className="w-3 h-3 mr-1" />
                {stats.failCount} Fail
              </Badge>
            </div>
          </div>

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
              onClick={() => handleOpenPendingDialog('overdue')}
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
        </CardContent>
      </Card>

      {/* Pending Checks Dialog */}
      <PendingChecksDialog
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
        initialFilter={pendingDialogFilter}
        onStartCheck={handleStartCheck}
      />
    </>
  );
}
