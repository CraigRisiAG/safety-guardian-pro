import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentIncidents } from '@/components/dashboard/RecentIncidents';
import { StartDrillForm } from '@/components/drills/StartDrillForm';
import { ActiveDrillBanner } from '@/components/dashboard/ActiveDrillBanner';
import { ComplianceCheckForm } from '@/components/dashboard/ComplianceCheckForm';
import { ComplianceStatsWidget } from '@/components/dashboard/ComplianceStatsWidget';
import { ComplianceHistoryDialog } from '@/components/dashboard/ComplianceHistoryDialog';
import { ComplianceCalendarDialog } from '@/components/dashboard/ComplianceCalendarDialog';
import { PersonnelDialog } from '@/components/dashboard/PersonnelDialog';
import { CertificateExpiryWidget } from '@/components/dashboard/CertificateExpiryWidget';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useOfficeAttendance } from '@/hooks/useOfficeAttendance';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { AlertTriangle, Siren, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComplianceCheck, UserPermission } from '@/types/admin';
import { Drill, Incident, IncidentSeverity, IncidentStatus, DrillType } from '@/types/safety';
import { toast } from 'sonner';
import { loadIncidentsFromStorage, saveIncidentsToStorage } from '@/lib/incidentsStorage';
import { getDrillsStorageSnapshot, loadDrillsFromStorage, saveDrillsToStorage } from '@/lib/drillsStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { loadCheckInsForDrill } from '@/lib/checkInsStorage';
import { computeSafetyComplianceBreakdown } from '@/utils/safetyComplianceScore';
import { useAuth } from '@/contexts/AuthContext';
import { filterPersonnelByUserScope } from '@/lib/personnelAccess';

const Index = () => {
  const { settings, updateUserPermission, bulkAddUserPermissions, deleteUserPermission } = useAdminSettings();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState(() => loadIncidentsFromStorage());
  const [drills, setDrills] = useState(() => loadDrillsFromStorage());
  const drillsStorageSnapshotRef = useRef<string | null>(getDrillsStorageSnapshot());
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const { personnelInOfficeToday } = useOfficeAttendance();
  const { activeDrill, endDrill, drillRecords } = useDrillStatus();
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [onBehalfOfUser, setOnBehalfOfUser] = useState<UserPermission | null>(null);
  const [isOpenIncidentsDialogOpen, setIsOpenIncidentsDialogOpen] = useState(false);
  const [isScheduledDrillsDialogOpen, setIsScheduledDrillsDialogOpen] = useState(false);
  const [isCreateDrillDialogOpen, setIsCreateDrillDialogOpen] = useState(false);
  const [isComplianceScoreDialogOpen, setIsComplianceScoreDialogOpen] = useState(false);

  const visiblePersonnel = useMemo(
    () => filterPersonnelByUserScope(settings.userPermissions, user),
    [settings.userPermissions, user],
  );

  // Unified Safety Compliance score (shared with Compliance Overview widget)
  const complianceBreakdown = computeSafetyComplianceBreakdown(settings);

  const complianceScoreVariant: 'safe' | 'warning' | 'emergency' =
    complianceBreakdown.score >= 85 ? 'safe' : complianceBreakdown.score >= 60 ? 'warning' : 'emergency';

  // Fire drill participation per floor (latest fire drill per floor)
  const fireDrillParticipation = (() => {
    const fireRecords = drillRecords
      .filter(r => r.type === 'fire')
      .slice()
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    type Row = {
      buildingId: string;
      buildingName: string;
      floorId: string;
      floorName: string;
      accounted: number;
      assigned: number;
      percent: number;
      drillDate: Date;
    };

    const seen = new Set<string>();
    const rows: Row[] = [];

    fireRecords.forEach(record => {
      record.floorStats.forEach(fs => {
        const key = `${record.buildingId}:${fs.floorId}`;
        if (seen.has(key)) return;
        seen.add(key);

        const assigned = settings.userPermissions.filter(
          p => p.primaryFloorId === fs.floorId || (p.buildingAccess?.includes(record.buildingId) && !p.primaryFloorId)
        ).length;
        const accounted = fs.safe + fs.needsAssistance;
        const denom = Math.max(assigned, accounted);
        const percent = denom > 0 ? Math.round((accounted / denom) * 100) : 0;

        rows.push({
          buildingId: record.buildingId,
          buildingName: record.buildingName,
          floorId: fs.floorId,
          floorName: fs.floorName,
          accounted,
          assigned,
          percent,
          drillDate: new Date(record.completedAt),
        });
      });
    });

    const overallAccounted = rows.reduce((s, r) => s + r.accounted, 0);
    const overallAssigned = rows.reduce((s, r) => s + Math.max(r.assigned, r.accounted), 0);
    const overallPercent = overallAssigned > 0 ? Math.round((overallAccounted / overallAssigned) * 100) : 0;

    return { rows, overallPercent, hasData: rows.length > 0 };
  })();
  
  useEffect(() => {
    saveIncidentsToStorage(incidents);
  }, [incidents]);

  useEffect(() => {
    saveDrillsToStorage(drills);
    drillsStorageSnapshotRef.current = getDrillsStorageSnapshot();
  }, [drills]);

  useEffect(() => {
    const syncDrillsFromStorage = () => {
      const snapshot = getDrillsStorageSnapshot();
      if (snapshot !== drillsStorageSnapshotRef.current) {
        drillsStorageSnapshotRef.current = snapshot;
        setDrills(loadDrillsFromStorage());
      }
    };

    window.addEventListener('storage', syncDrillsFromStorage);
    const intervalId = setInterval(syncDrillsFromStorage, 2000);

    return () => {
      window.removeEventListener('storage', syncDrillsFromStorage);
      clearInterval(intervalId);
    };
  }, []);

  const openIncidentsList = incidents.filter((incident) => incident.status === 'open');
  const openIncidents = openIncidentsList.length;
  const scheduledDrills = drills
    .filter((drill) => drill.status === 'scheduled')
    .sort((a, b) => {
      const left = a.scheduledFor ? a.scheduledFor.getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.scheduledFor ? b.scheduledFor.getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    });
  const upcomingDrills = scheduledDrills.length;
  
  const checkInStats = (() => {
    if (!activeDrill) {
      return {
        safe: 0,
        needsAssistance: 0,
        pending: 0,
      };
    }

    const checkIns = loadCheckInsForDrill(activeDrill.id);
    const selectedBuildingIds = activeDrill.location.buildingIds?.length
      ? activeDrill.location.buildingIds
      : [activeDrill.location.buildingId];

    const selectedBuildings = settings.buildings.filter((building) => selectedBuildingIds.includes(building.id));
    const selectedFloorIds = activeDrill.location.floorIds;
    const selectedAreaIds = activeDrill.location.areaIds;

    const floorToBuildingMap = new Map<string, string>();
    selectedBuildings.forEach((building) => {
      building.floors.forEach((floor) => {
        floorToBuildingMap.set(floor.id, building.id);
      });
    });

    const targetPersonnel = settings.userPermissions.filter((person) => {
      if (selectedAreaIds.length > 0 && person.primaryAreaId) {
        return selectedAreaIds.includes(person.primaryAreaId);
      }

      if (selectedFloorIds.length > 0 && person.primaryFloorId) {
        return selectedFloorIds.includes(person.primaryFloorId);
      }

      if (person.primaryFloorId) {
        const buildingId = floorToBuildingMap.get(person.primaryFloorId);
        if (buildingId) {
          return selectedBuildingIds.includes(buildingId);
        }
      }

      return person.buildingAccess.some((buildingId) => selectedBuildingIds.includes(buildingId));
    });

    const targetPersonnelIds = new Set(targetPersonnel.map((person) => person.id));
    const targetStaffCodes = new Set(
      targetPersonnel
        .map((person) => person.staffCode?.toLowerCase().trim())
        .filter((code): code is string => !!code),
    );

    const targetedCheckIns = checkIns.filter((entry) => {
      if (entry.personnelId && targetPersonnelIds.has(entry.personnelId)) {
        return true;
      }
      if (entry.staffCode) {
        return targetStaffCodes.has(entry.staffCode.toLowerCase().trim());
      }
      return false;
    });

    const safe = targetedCheckIns.filter((entry) => entry.status === 'safe').length;
    const needsAssistance = targetedCheckIns.filter((entry) => entry.status === 'needs-assistance').length;
    const derivedPending = Math.max(0, targetPersonnel.length - safe - needsAssistance);

    return {
      safe,
      needsAssistance,
      pending: derivedPending,
    };
  })();

  // Handle starting a scheduled check
  const handleStartScheduledCheck = (check: ComplianceCheck, onBehalfOf?: UserPermission) => {
    setSelectedCheck(check);
    setOnBehalfOfUser(onBehalfOf || null);
    
    // Show a toast to guide user
    const message = onBehalfOf 
      ? `Starting "${check.name}" on behalf of ${onBehalfOf.userName}`
      : `Starting "${check.name}"`;
    toast.info(message, { 
      description: 'Use the Compliance Check form to complete this check.',
      duration: 4000
    });
  };

  const drillTypeLabels: Record<DrillType, string> = {
    fire: 'Fire Drill',
    earthquake: 'Earthquake Drill',
    lockdown: 'Lockdown Drill',
    evacuation: 'Evacuation Drill',
    medical: 'Medical Emergency',
  };

  const getDrillLocation = (drill: Drill) => {
    const selectedBuildingIds = drill.location.buildingIds?.length
      ? drill.location.buildingIds
      : [drill.location.buildingId];
    const selectedBuildings = settings.buildings.filter((building) => selectedBuildingIds.includes(building.id));
    const allFloors = selectedBuildings.flatMap((building) => building.floors);
    const floors = allFloors.filter((floor) => drill.location.floorIds.includes(floor.id));
    return {
      building: selectedBuildings.map((building) => building.name).join(', ') || 'Unknown Building',
      floors: floors.map((floor) => floor.name).join(', ') || 'All floors',
    };
  };

  const handleCreateScheduledDrill = (data: {
    type: DrillType;
    buildingIds: string[];
    floorIds: string[];
    areaIds: string[];
    scheduledFor?: Date;
  }) => {
    const primaryBuildingId = data.buildingIds[0];
    if (!primaryBuildingId) {
      return;
    }

    const newDrill: Drill = {
      id: `drill-${Date.now()}`,
      type: data.type,
      status: 'scheduled',
      location: {
        buildingId: primaryBuildingId,
        buildingIds: data.buildingIds,
        floorIds: data.floorIds,
        areaIds: data.areaIds,
      },
      scheduledFor: data.scheduledFor ?? undefined,
      initiatedBy: 'Safety Officer',
    };

    setDrills((previous) => [newDrill, ...previous]);
    setIsCreateDrillDialogOpen(false);
    toast.success('Scheduled drill created');
  };

  const handleIncidentUpdate = (
    incidentId: string,
    updates: {
      title: string;
      description: string;
      severity: IncidentSeverity;
      status: IncidentStatus;
      rootCause?: string;
    },
  ) => {
    const now = new Date();

    const buildUpdatedIncident = (incident: Incident): Incident => {
      const updatedDates = { ...incident.statusDates };

      if (updates.status === 'in_progress' && !updatedDates.inProgressAt) {
        updatedDates.inProgressAt = now;
      }

      if (updates.status === 'closed') {
        if (!updatedDates.inProgressAt) {
          updatedDates.inProgressAt = now;
        }

        if (!updatedDates.closedAt) {
          updatedDates.closedAt = now;
        }
      }

      return {
        ...incident,
        title: updates.title,
        description: updates.description,
        severity: updates.severity,
        status: updates.status,
        rootCause: updates.status === 'closed' ? updates.rootCause : incident.rootCause,
        statusDates: updatedDates,
      };
    };

    setIncidents((previous) => previous.map((incident) => (
      incident.id === incidentId ? buildUpdatedIncident(incident) : incident
    )));
    toast.success('Incident updated successfully');
  };

  const getIncidentLocationName = (incident: Incident) => {
    const building = settings.buildings.find((b) => b.id === incident.location.buildingId);
    const floor = building?.floors.find((f) => f.id === incident.location.floorId);
    const area = floor?.areas.find((a) => a.id === incident.location.areaId);

    return `${area?.name ?? 'Unknown area'}, ${floor?.name ?? 'Unknown floor'}, ${building?.name ?? 'Unknown building'}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Active Drill Banner */}
        {activeDrill && (
          <ActiveDrillBanner 
            drill={activeDrill} 
            checkInCount={checkInStats}
            onEndDrill={() => {
              const record = endDrill(checkInStats);
              if (record) {
                setDrills((previous) => previous.map((drill) => (
                  drill.id === record.drillId
                    ? { ...drill, status: 'completed', completedAt: new Date() }
                    : drill
                )));
                toast.success('Drill ended successfully', {
                  description: `Duration: ${record.durationMinutes} minutes. ${record.checkInStats.total} personnel accounted for.`,
                });
              }
            }}
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open Incidents"
            value={openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={openIncidents > 0 ? 'warning' : 'default'}
            trend={{ value: 12, isPositive: true }}
            onClick={() => setIsOpenIncidentsDialogOpen(true)}
          />
          <StatCard
            title="Scheduled Drills"
            value={upcomingDrills}
            icon={<Siren className="w-5 h-5" />}
            variant="info"
            onClick={() => setIsScheduledDrillsDialogOpen(true)}
          />
          <StatCard
            title="Safety Compliance"
            value={`${complianceBreakdown.score}%`}
            icon={<ShieldCheck className="w-5 h-5" />}
            variant={complianceScoreVariant}
            onClick={() => setIsComplianceScoreDialogOpen(true)}
          />
          <PersonnelDialog
            personnel={settings.userPermissions}
            buildings={settings.buildings}
            onUpdate={updateUserPermission}
            onBulkAdd={bulkAddUserPermissions}
            onDelete={deleteUserPermission}
            externalOpen={personnelOpen}
            onExternalOpenChange={setPersonnelOpen}
            trigger={
              <div className="h-full">
                <StatCard
                  title="Total Personnel"
                  value={visiblePersonnel.length}
                  icon={<Users className="w-5 h-5" />}
                  clickable
                />
              </div>
            }
          />
        </div>

        <Dialog open={isOpenIncidentsDialogOpen} onOpenChange={setIsOpenIncidentsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Open Incidents ({openIncidents})</DialogTitle>
            </DialogHeader>

            {openIncidentsList.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No open incidents.</div>
            ) : (
              <div className="divide-y divide-border">
                {openIncidentsList.map((incident) => (
                  <div key={incident.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{incident.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{incident.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{getIncidentLocationName(incident)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(incident.reportedAt, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isScheduledDrillsDialogOpen} onOpenChange={setIsScheduledDrillsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scheduled Drills ({upcomingDrills})</DialogTitle>
            </DialogHeader>

            {scheduledDrills.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No scheduled drills.</div>
            ) : (
              <div className="divide-y divide-border">
                {scheduledDrills.map((drill) => {
                  const location = getDrillLocation(drill);
                  return (
                    <div key={drill.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{drillTypeLabels[drill.type]}</p>
                          <p className="text-sm text-muted-foreground mt-1">{location.building} • {location.floors}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {drill.scheduledFor ? format(drill.scheduledFor, 'PPp') : 'Not scheduled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2">
              <Dialog open={isCreateDrillDialogOpen} onOpenChange={setIsCreateDrillDialogOpen}>
                <Button className="gap-2" onClick={() => setIsCreateDrillDialogOpen(true)}>
                  <Siren className="w-4 h-4" />
                  Create Another Drill
                </Button>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Scheduled Drill</DialogTitle>
                  </DialogHeader>
                  <StartDrillForm
                    buildings={settings.buildings}
                    mode="schedule"
                    onSubmit={handleCreateScheduledDrill}
                    onCancel={() => setIsCreateDrillDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isComplianceScoreDialogOpen} onOpenChange={setIsComplianceScoreDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Safety Compliance Score</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="text-center">
                <div className={`text-5xl font-bold ${
                  complianceScoreVariant === 'safe' ? 'text-safe' :
                  complianceScoreVariant === 'warning' ? 'text-warning' : 'text-emergency'
                }`}>
                  {complianceBreakdown.score}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Overall Safety Compliance</p>
              </div>
              <Progress value={complianceBreakdown.score} className="h-2" />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">How this is calculated</h4>
                <p className="text-sm text-muted-foreground">
                  The score combines the quality of completed compliance checks (70%) with coverage of required health & safety officials across areas and work days (30%). It matches the score shown in the Compliance Overview widget.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li><span className="text-safe font-medium">Pass</span> = 1.0 point</li>
                  <li><span className="text-warning font-medium">Partial</span> = 0.5 points</li>
                  <li><span className="text-emergency font-medium">Fail</span> = 0 points</li>
                  <li>Each <span className="text-emergency font-medium">overdue</span> scheduled check subtracts 0.5 points and adds to the total.</li>
                  <li>Officials coverage = (required − missing) ÷ required across all areas, days and safety roles.</li>
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  Formula: <code className="bg-muted px-1 rounded">checks × 0.7 + officials coverage × 0.3</code>
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-foreground">{complianceBreakdown.checksScore}%</div>
                    <div className="text-xs text-muted-foreground">Checks Quality (70%)</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-foreground">{complianceBreakdown.officialCoverageScore}%</div>
                    <div className="text-xs text-muted-foreground">
                      Officials Coverage (30%)
                      {complianceBreakdown.requiredOfficialsTotal > 0 && (
                        <> · {complianceBreakdown.missingOfficialsTotal} gaps</>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-safe-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-safe">{complianceBreakdown.passCount}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="bg-warning-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-warning">{complianceBreakdown.partialCount}</div>
                  <div className="text-xs text-muted-foreground">Partial</div>
                </div>
                <div className="bg-emergency-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emergency">{complianceBreakdown.failCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-emergency-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emergency">{complianceBreakdown.overdueCount}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                Total completed checks: <span className="font-medium text-foreground">{complianceBreakdown.totalCompleted}</span>
                {complianceBreakdown.totalCompleted === 0 && complianceBreakdown.overdueCount === 0 && (
                  <p className="mt-1">No checks have been completed yet — score defaults to 100%.</p>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Fire Drill Participation by Area</h4>
                  {fireDrillParticipation.hasData && (
                    <span className="text-sm font-bold text-foreground">{fireDrillParticipation.overallPercent}%</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of personnel accounted for (safe or needing assistance) on each floor during the most recent fire drill for that floor.
                </p>
                {!fireDrillParticipation.hasData ? (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                    No fire drills have been completed yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fireDrillParticipation.rows.map(row => (
                      <div key={`${row.buildingId}-${row.floorId}`} className="bg-muted/40 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground truncate">
                            {row.buildingName} • {row.floorName}
                          </span>
                          <span className={`font-semibold ${
                            row.percent >= 85 ? 'text-safe' : row.percent >= 60 ? 'text-warning' : 'text-emergency'
                          }`}>
                            {row.percent}%
                          </span>
                        </div>
                        <Progress value={row.percent} className="h-1.5 mt-2" />
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                          <span>{row.accounted} of {Math.max(row.assigned, row.accounted)} personnel</span>
                          <span>{format(row.drillDate, 'PP')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentIncidents
            incidents={incidents}
            buildings={settings.buildings}
            onUpdateIncident={handleIncidentUpdate}
          />
          
          {/* Compliance Stats */}
          <div className="space-y-6">
            <ComplianceStatsWidget onStartCheck={handleStartScheduledCheck} />
            <CertificateExpiryWidget />
          </div>
          
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-2 gap-3 sm:gap-4">
              <Link 
                to="/incidents" 
                className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-warning-muted hover:bg-warning-muted/80 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-warning/20"
              >
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-warning" />
                <span className="font-medium text-foreground text-sm sm:text-base text-center">Report Incident</span>
              </Link>
              <Link 
                to="/drills" 
                className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-emergency-muted hover:bg-emergency-muted/80 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-emergency/20"
              >
                <Siren className="w-6 h-6 sm:w-8 sm:h-8 text-emergency" />
                <span className="font-medium text-foreground text-sm sm:text-base text-center">Start Drill</span>
              </Link>
              {activeDrill ? (
                <Link 
                  to="/check-in" 
                  className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-safe-muted hover:bg-safe-muted/80 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-safe/20"
                >
                  <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-safe" />
                  <span className="font-medium text-foreground text-sm sm:text-base text-center">Safety Check-In</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-muted/50 cursor-not-allowed opacity-50">
                  <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground text-sm sm:text-base text-center">Safety Check-In</span>
                  <span className="text-xs text-muted-foreground">No active drill</span>
                </div>
              )}
              <ComplianceCheckForm 
                preselectedCheck={selectedCheck}
                onBehalfOf={onBehalfOfUser}
                onCheckComplete={() => {
                  setSelectedCheck(null);
                  setOnBehalfOfUser(null);
                }}
              />
              <ComplianceHistoryDialog />
              <ComplianceCalendarDialog onStartCheck={handleStartScheduledCheck} />
              <button
                onClick={() => setPersonnelOpen(true)}
                className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-info-muted hover:bg-info-muted/80 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-info/20"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-info" />
                <span className="font-medium text-foreground text-sm sm:text-base text-center">View Personnel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
