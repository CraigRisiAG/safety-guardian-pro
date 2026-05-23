import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Calendar, Flame, HardHat, HeartPulse, ShieldCheck, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  UserPermission, 
  CustomBuilding, 
  WorkDay, 
  WORK_DAY_LABELS, 
  ALL_WORK_DAYS, 
  SafetyRole, 
  SAFETY_ROLE_LABELS, 
  SAFETY_ROLE_COLORS,
  ALL_SAFETY_ROLES 
} from '@/types/admin';

interface SafetyRoleCoverageReportProps {
  permissions: UserPermission[];
  buildings: CustomBuilding[];
  requiredDays: WorkDay[];
}

interface CoverageGap {
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  missingRoles: SafetyRole[];
  day: WorkDay;
}

const getSafetyRoleIcon = (role: SafetyRole) => {
  switch (role) {
    case 'fire_marshall': return Flame;
    case 'evacuation_warden': return HardHat;
    case 'first_aider': return HeartPulse;
    case 'health_safety_officer': return ShieldCheck;
  }
};

export function SafetyRoleCoverageReport({ permissions, buildings, requiredDays }: SafetyRoleCoverageReportProps) {
  const [selectedDay, setSelectedDay] = useState<WorkDay | 'all'>('all');
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>([]);

  const toggleExpanded = (buildingId: string) => {
    setExpandedBuildings(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  // Calculate coverage gaps
  const coverageAnalysis = useMemo(() => {
    const gaps: CoverageGap[] = [];
    const coverageByBuildingFloorDay: Record<string, Record<string, Record<WorkDay, SafetyRole[]>>> = {};

    // Initialize coverage structure
    buildings.forEach(building => {
      coverageByBuildingFloorDay[building.id] = {};
      building.floors.forEach(floor => {
        coverageByBuildingFloorDay[building.id][floor.id] = {} as Record<WorkDay, SafetyRole[]>;
        ALL_WORK_DAYS.forEach(day => {
          coverageByBuildingFloorDay[building.id][floor.id][day] = [];
        });
      });
    });

    // Fill in coverage from permissions
    permissions.forEach(user => {
      if (!user.safetyRoles?.length || !user.primaryFloorId) return;
      
      const userWorkDays = user.workDays || [];
      
      user.buildingAccess.forEach(buildingId => {
        if (!coverageByBuildingFloorDay[buildingId]) return;
        
        // Use primary floor if set, otherwise apply to all floors in building
        const building = buildings.find(b => b.id === buildingId);
        if (!building) return;
        
        const targetFloors = user.primaryFloorId 
          ? building.floors.filter(f => f.id === user.primaryFloorId)
          : building.floors;
        
        targetFloors.forEach(floor => {
          if (!coverageByBuildingFloorDay[buildingId][floor.id]) return;
          
          userWorkDays.forEach(day => {
            user.safetyRoles.forEach(role => {
              if (!coverageByBuildingFloorDay[buildingId][floor.id][day].includes(role)) {
                coverageByBuildingFloorDay[buildingId][floor.id][day].push(role);
              }
            });
          });
        });
      });
    });

    // Identify gaps
    buildings.forEach(building => {
      building.floors.forEach(floor => {
        requiredDays.forEach(day => {
          const coveredRoles = coverageByBuildingFloorDay[building.id]?.[floor.id]?.[day] || [];
          const missingRoles = ALL_SAFETY_ROLES.filter(role => !coveredRoles.includes(role));
          
          if (missingRoles.length > 0) {
            gaps.push({
              buildingId: building.id,
              buildingName: building.name,
              floorId: floor.id,
              floorName: floor.name,
              missingRoles,
              day,
            });
          }
        });
      });
    });

    // Group gaps by building
    const gapsByBuilding = gaps.reduce((acc, gap) => {
      if (!acc[gap.buildingId]) {
        acc[gap.buildingId] = {
          buildingName: gap.buildingName,
          gaps: [],
        };
      }
      acc[gap.buildingId].gaps.push(gap);
      return acc;
    }, {} as Record<string, { buildingName: string; gaps: CoverageGap[] }>);

    // Coverage stats
    const totalSlots = buildings.reduce(
      (sum, b) => sum + b.floors.length * requiredDays.length * ALL_SAFETY_ROLES.length, 
      0
    );
    const gapCount = gaps.reduce((sum, g) => sum + g.missingRoles.length, 0);
    const coveragePercent = totalSlots > 0 ? Math.round(((totalSlots - gapCount) / totalSlots) * 100) : 100;

    return {
      gaps,
      gapsByBuilding,
      coveragePercent,
      totalGaps: gapCount,
      coverageByBuildingFloorDay,
    };
  }, [permissions, buildings, requiredDays]);

  // Filter gaps by selected day
  const filteredGapsByBuilding = useMemo(() => {
    if (selectedDay === 'all') return coverageAnalysis.gapsByBuilding;

    const filtered: typeof coverageAnalysis.gapsByBuilding = {};
    Object.entries(coverageAnalysis.gapsByBuilding).forEach(([buildingId, data]) => {
      const dayGaps = data.gaps.filter(g => g.day === selectedDay);
      if (dayGaps.length > 0) {
        filtered[buildingId] = {
          buildingName: data.buildingName,
          gaps: dayGaps,
        };
      }
    });
    return filtered;
  }, [coverageAnalysis, coverageAnalysis.gapsByBuilding, selectedDay]);

  const gapsForSelectedDay = selectedDay === 'all' 
    ? coverageAnalysis.totalGaps 
    : coverageAnalysis.gaps.filter(g => g.day === selectedDay).reduce((sum, g) => sum + g.missingRoles.length, 0);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Safety Role Coverage Report
            </CardTitle>
            <CardDescription>
              Identify floors and days without safety role representation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedDay} onValueChange={(v) => setSelectedDay(v as WorkDay | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {requiredDays.map(day => (
                  <SelectItem key={day} value={day}>{WORK_DAY_LABELS[day]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{coverageAnalysis.coveragePercent}%</p>
            <p className="text-xs text-muted-foreground">Overall Coverage</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{gapsForSelectedDay}</p>
            <p className="text-xs text-muted-foreground">Coverage Gaps</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{buildings.length}</p>
            <p className="text-xs text-muted-foreground">Buildings</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{permissions.filter(p => (p.safetyRoles?.length || 0) > 0).length}</p>
            <p className="text-xs text-muted-foreground">Users with Roles</p>
          </div>
        </div>

        {/* Coverage Gaps */}
        {Object.keys(filteredGapsByBuilding).length === 0 ? (
          <Alert className="bg-safe/10 border-safe">
            <CheckCircle2 className="h-4 w-4 text-safe" />
            <AlertTitle className="text-safe">Full Coverage</AlertTitle>
            <AlertDescription>
              All floors have safety role representation for {selectedDay === 'all' ? 'all days' : WORK_DAY_LABELS[selectedDay]}.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Alert className="bg-warning/10 border-warning">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Coverage Gaps Detected</AlertTitle>
              <AlertDescription>
                The following locations are missing safety role coverage. Consider assigning additional personnel.
              </AlertDescription>
            </Alert>

            {Object.entries(filteredGapsByBuilding).map(([buildingId, { buildingName, gaps }]) => {
              // Group gaps by floor
              const gapsByFloor = gaps.reduce((acc, gap) => {
                if (!acc[gap.floorId]) {
                  acc[gap.floorId] = { floorName: gap.floorName, gaps: [] };
                }
                acc[gap.floorId].gaps.push(gap);
                return acc;
              }, {} as Record<string, { floorName: string; gaps: CoverageGap[] }>);

              return (
                <Collapsible
                  key={buildingId}
                  open={expandedBuildings.includes(buildingId)}
                  onOpenChange={() => toggleExpanded(buildingId)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedBuildings.includes(buildingId) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">{buildingName}</span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {gaps.reduce((sum, g) => sum + g.missingRoles.length, 0)} gaps
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-3 space-y-3 border-t">
                        {Object.entries(gapsByFloor).map(([floorId, { floorName, gaps: floorGaps }]) => (
                          <div key={floorId} className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{floorName}</p>
                            <div className="grid gap-2">
                              {/* Group by day */}
                              {selectedDay === 'all' ? (
                                requiredDays.map(day => {
                                  const dayGap = floorGaps.find(g => g.day === day);
                                  if (!dayGap) return null;
                                  return (
                                    <div key={day} className="flex items-center justify-between bg-background rounded p-2 text-sm">
                                      <span className="font-medium">{WORK_DAY_LABELS[day]}</span>
                                      <div className="flex flex-wrap gap-1">
                                        {dayGap.missingRoles.map(role => {
                                          const Icon = getSafetyRoleIcon(role);
                                          return (
                                            <Badge key={role} variant="outline" className={`text-xs ${SAFETY_ROLE_COLORS[role]}`}>
                                              <Icon className="w-3 h-3 mr-1" />
                                              {SAFETY_ROLE_LABELS[role]}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }).filter(Boolean)
                              ) : (
                                floorGaps.map((gap, idx) => (
                                  <div key={idx} className="flex flex-wrap gap-1">
                                    {gap.missingRoles.map(role => {
                                      const Icon = getSafetyRoleIcon(role);
                                      return (
                                        <Badge key={role} variant="outline" className={`text-xs ${SAFETY_ROLE_COLORS[role]}`}>
                                          <Icon className="w-3 h-3 mr-1" />
                                          {SAFETY_ROLE_LABELS[role]}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
