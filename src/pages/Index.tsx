import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentIncidents } from '@/components/dashboard/RecentIncidents';
import { ActiveDrillBanner } from '@/components/dashboard/ActiveDrillBanner';
import { ComplianceCheckForm } from '@/components/dashboard/ComplianceCheckForm';
import { ComplianceStatsWidget } from '@/components/dashboard/ComplianceStatsWidget';
import { ComplianceHistoryDialog } from '@/components/dashboard/ComplianceHistoryDialog';
import { ComplianceCalendarDialog } from '@/components/dashboard/ComplianceCalendarDialog';
import { PersonnelDialog } from '@/components/dashboard/PersonnelDialog';
import { CertificateExpiryWidget } from '@/components/dashboard/CertificateExpiryWidget';
import { mockDrills, mockCheckIns } from '@/data/mockData';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useOfficeAttendance } from '@/hooks/useOfficeAttendance';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { AlertTriangle, Siren, ShieldCheck, Users } from 'lucide-react';
import { ComplianceCheck, UserPermission } from '@/types/admin';
import { Incident, IncidentSeverity, IncidentStatus } from '@/types/safety';
import { toast } from 'sonner';
import { loadIncidentsFromStorage, saveIncidentsToStorage } from '@/lib/incidentsStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

const Index = () => {
  const { settings, updateUserPermission, bulkAddUserPermissions, deleteUserPermission } = useAdminSettings();
  const [incidents, setIncidents] = useState(() => loadIncidentsFromStorage());
  const [personnelOpen, setPersonnelOpen] = useState(false);
  const { personnelInOfficeToday } = useOfficeAttendance();
  const { activeDrill, endDrill } = useDrillStatus();
  const fallbackDrill = activeDrill || mockDrills.find(d => d.status === 'active') || null;
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [onBehalfOfUser, setOnBehalfOfUser] = useState<UserPermission | null>(null);
  const [isOpenIncidentsDialogOpen, setIsOpenIncidentsDialogOpen] = useState(false);
  
  useEffect(() => {
    saveIncidentsToStorage(incidents);
  }, [incidents]);

  const openIncidentsList = incidents.filter((incident) => incident.status === 'open');
  const openIncidents = openIncidentsList.length;
  const upcomingDrills = mockDrills.filter(d => d.status === 'scheduled').length;
  
  const checkInStats = {
    safe: mockCheckIns.filter(c => c.status === 'safe').length,
    needsAssistance: mockCheckIns.filter(c => c.status === 'needs-assistance').length,
    pending: mockCheckIns.filter(c => c.status === 'pending').length,
  };

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
        {fallbackDrill && (
          <ActiveDrillBanner 
            drill={fallbackDrill} 
            checkInCount={checkInStats}
            onEndDrill={() => {
              const record = endDrill(checkInStats);
              if (record) {
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
          />
          <StatCard
            title="Safety Compliance"
            value="94%"
            icon={<ShieldCheck className="w-5 h-5" />}
            variant="safe"
            trend={{ value: 3, isPositive: true }}
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
                  value={settings.userPermissions.length}
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
