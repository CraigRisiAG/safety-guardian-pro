import { useMemo } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CompletedCheckRecord, CHECK_TYPE_LABELS } from '@/types/compliance';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, isAfter, isBefore } from 'date-fns';
import { useAdminSettings } from '@/hooks/useAdminSettings';

const STORAGE_KEY = 'safeguard_completed_checks';

export function ComplianceStatsWidget() {
  const { settings } = useAdminSettings();
  
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

    // Calculate overdue scheduled checks
    const overdueChecks = settings.complianceChecks.filter(check => {
      const dueDate = new Date(check.nextDue);
      return isBefore(dueDate, now) && check.status !== 'completed';
    });

    return {
      thisWeek: thisWeekRecords.length,
      total: totalChecks,
      passCount,
      failCount,
      partialCount,
      passRate: totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0,
      byType,
      overdueCount: overdueChecks.length,
      overdueChecks,
    };
  }, [settings.complianceChecks]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Compliance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* This Week Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{stats.thisWeek}</div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${stats.overdueCount > 0 ? 'bg-emergency-muted' : 'bg-safe-muted'}`}>
            <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-emergency' : 'text-safe'}`}>
              {stats.overdueCount}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
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
          <div className="text-sm text-muted-foreground">This Week by Type</div>
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
          <div className="bg-emergency-muted/50 border border-emergency/30 rounded-lg p-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
