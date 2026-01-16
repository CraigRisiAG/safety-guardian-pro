import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building, Floor, SafetyCheckIn } from '@/types/safety';
import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloorHeadcount {
  floorId: string;
  expectedHeadcount: number;
}

interface FloorCheckInProgressProps {
  building: Building;
  drillFloorIds: string[];
  checkIns: SafetyCheckIn[];
  floorHeadcounts: FloorHeadcount[];
}

export function FloorCheckInProgress({ 
  building, 
  drillFloorIds, 
  checkIns,
  floorHeadcounts 
}: FloorCheckInProgressProps) {
  const floors = building.floors.filter(f => drillFloorIds.includes(f.id));

  const getFloorStats = (floor: Floor) => {
    const floorCheckIns = checkIns.filter(c => c.location.floorId === floor.id);
    const headcountConfig = floorHeadcounts.find(h => h.floorId === floor.id);
    const expectedHeadcount = headcountConfig?.expectedHeadcount || 0;
    
    const safe = floorCheckIns.filter(c => c.status === 'safe').length;
    const needsAssistance = floorCheckIns.filter(c => c.status === 'needs-assistance').length;
    const checkedIn = safe + needsAssistance;
    const percentage = expectedHeadcount > 0 ? Math.round((checkedIn / expectedHeadcount) * 100) : 0;

    return { 
      safe, 
      needsAssistance, 
      checkedIn, 
      expectedHeadcount, 
      percentage,
      pending: Math.max(0, expectedHeadcount - checkedIn)
    };
  };

  // Calculate overall stats
  const overallStats = floors.reduce((acc, floor) => {
    const stats = getFloorStats(floor);
    return {
      safe: acc.safe + stats.safe,
      needsAssistance: acc.needsAssistance + stats.needsAssistance,
      checkedIn: acc.checkedIn + stats.checkedIn,
      expectedHeadcount: acc.expectedHeadcount + stats.expectedHeadcount,
    };
  }, { safe: 0, needsAssistance: 0, checkedIn: 0, expectedHeadcount: 0 });

  const overallPercentage = overallStats.expectedHeadcount > 0 
    ? Math.round((overallStats.checkedIn / overallStats.expectedHeadcount) * 100) 
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            Check-in Progress
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{overallPercentage}%</span>
            <span className="text-sm text-muted-foreground">
              ({overallStats.checkedIn}/{overallStats.expectedHeadcount})
            </span>
          </div>
        </div>
        <Progress value={overallPercentage} className="mt-3 h-3" />
      </div>
      
      <div className="divide-y divide-border">
        {floors.map((floor) => {
          const stats = getFloorStats(floor);
          
          return (
            <div key={floor.id} className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{floor.name}</span>
                  {stats.needsAssistance > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {stats.needsAssistance} need help
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={cn(
                    "font-semibold",
                    stats.percentage >= 100 ? "text-safe" : 
                    stats.percentage >= 75 ? "text-primary" : 
                    stats.percentage >= 50 ? "text-warning" : "text-muted-foreground"
                  )}>
                    {stats.percentage}%
                  </span>
                  <span className="text-muted-foreground">
                    {stats.checkedIn}/{stats.expectedHeadcount} checked in
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={stats.percentage} 
                  className={cn(
                    "h-2 flex-1",
                    stats.percentage >= 100 && "[&>div]:bg-safe"
                  )} 
                />
                {stats.percentage >= 100 && (
                  <CheckCircle2 className="w-4 h-4 text-safe flex-shrink-0" />
                )}
              </div>
              {stats.pending > 0 && stats.expectedHeadcount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pending} {stats.pending === 1 ? 'person' : 'people'} still pending
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}