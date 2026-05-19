import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { IncidentForm } from '@/components/incidents/IncidentForm';
import { Incident, IncidentSeverity, IncidentStatus } from '@/types/safety';
import { IncidentEditForm } from '@/components/incidents/IncidentEditForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { loadIncidentsFromStorage, saveIncidentsToStorage } from '@/lib/incidentsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { canResolveIncidentsForUser, findCurrentUserPermission, getScopedAreaIds, isSuperAdminPermission } from '@/lib/personnelAccess';

const severityStyles = {
  low: 'bg-info-muted text-info border-info/20',
  medium: 'bg-warning-muted text-warning border-warning/20',
  high: 'bg-emergency-muted text-emergency border-emergency/20',
  critical: 'bg-emergency text-emergency-foreground border-emergency',
};

const statusStyles = {
  open: {
    icon: AlertTriangle,
    color: 'text-emergency',
    bg: 'bg-emergency-muted',
    row: 'bg-emergency-muted/35 border-emergency/15',
    label: 'Open',
  },
  in_progress: {
    icon: Clock,
    color: 'text-info',
    bg: 'bg-info-muted',
    row: 'bg-info-muted/35 border-info/15',
    label: 'In Progress',
  },
  closed: {
    icon: CheckCircle2,
    color: 'text-safe',
    bg: 'bg-safe-muted',
    row: 'bg-safe-muted/35 border-safe/15',
    label: 'Closed',
  },
};

export default function Incidents() {
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidentsFromStorage());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const currentPermission = useMemo(
    () => findCurrentUserPermission(user, settings.userPermissions),
    [user, settings.userPermissions],
  );
  const canResolveIncidents = canResolveIncidentsForUser(currentPermission);
  const isSuperAdmin = isSuperAdminPermission(currentPermission);
  const scopedAreaIds = useMemo(
    () => new Set(getScopedAreaIds(currentPermission, settings.buildings)),
    [currentPermission, settings.buildings],
  );

  const visibleIncidents = useMemo(() => {
    if (isSuperAdmin) {
      return incidents;
    }

    return incidents.filter((incident) => scopedAreaIds.has(incident.location.areaId));
  }, [incidents, isSuperAdmin, scopedAreaIds]);

  useEffect(() => {
    saveIncidentsToStorage(incidents);
  }, [incidents]);

  const getLocationName = (incident: Incident) => {
    const building = settings.buildings.find((b) => b.id === incident.location.buildingId);
    const floor = building?.floors.find(f => f.id === incident.location.floorId);
    const area = floor?.areas.find(a => a.id === incident.location.areaId);
    return {
      building: building?.name ?? 'Unknown building',
      floor: floor?.name ?? 'Unknown floor',
      area: area?.name ?? 'Unknown area',
    };
  };

  const filteredIncidents = visibleIncidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesBuilding = buildingFilter === 'all' || incident.location.buildingId === buildingFilter;
    const matchesArea = areaFilter === 'all' || incident.location.areaId === areaFilter;
    return matchesSearch && matchesSeverity && matchesStatus && matchesBuilding && matchesArea;
  });

  const scopedBuildings = useMemo(() => {
    if (isSuperAdmin) {
      return settings.buildings;
    }

    return settings.buildings
      .map((building) => {
        const floors = building.floors
          .map((floor) => ({
            ...floor,
            areas: floor.areas.filter((area) => scopedAreaIds.has(area.id)),
          }))
          .filter((floor) => floor.areas.length > 0);

        return {
          ...building,
          floors,
        };
      })
      .filter((building) => building.floors.length > 0);
  }, [isSuperAdmin, settings.buildings, scopedAreaIds]);

  const selectedFilterBuilding = buildingFilter === 'all'
    ? null
    : scopedBuildings.find((building) => building.id === buildingFilter);

  const filterAreas = selectedFilterBuilding
    ? selectedFilterBuilding.floors.flatMap((floor) => floor.areas)
    : scopedBuildings.flatMap((building) => building.floors.flatMap((floor) => floor.areas));

  const buildUpdatedIncident = (
    incident: Incident,
    updates: {
      title: string;
      description: string;
      severity: IncidentSeverity;
      status: IncidentStatus;
      rootCause?: string;
    },
  ): Incident => {
    const now = new Date();
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

  const handleSubmit = (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    buildingId: string;
    floorId: string;
    areaId: string;
  }) => {
    if (!canResolveIncidents) {
      toast.error('You do not have permission to report incidents');
      return;
    }
    const newIncident: Incident = {
      id: `incident-${Date.now()}`,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'open',
      location: {
        buildingId: data.buildingId,
        floorId: data.floorId,
        areaId: data.areaId,
      },
      reportedBy: 'Safety Officer',
      reportedAt: new Date(),
      statusDates: {
        openAt: new Date(),
      },
    };
    setIncidents((previous) => [newIncident, ...previous]);
    setIsDialogOpen(false);
    toast.success('Incident reported successfully');
  };

  const handleEditSave = (
    incidentId: string,
    updates: {
      title: string;
      description: string;
      severity: IncidentSeverity;
      status: IncidentStatus;
      rootCause?: string;
    },
  ) => {
    if (!canResolveIncidents) {
      toast.error('You do not have permission to resolve incidents');
      return;
    }

    setIncidents((previous) =>
      previous.map((incident) =>
        incident.id === incidentId ? buildUpdatedIncident(incident, updates) : incident,
      ),
    );
    setEditingIncident(null);
    toast.success('Incident updated successfully');
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Incident Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Track and manage safety incidents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto" disabled={!canResolveIncidents}>
                <Plus className="w-4 h-4" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <IncidentForm 
                buildings={scopedBuildings}
                onSubmit={handleSubmit} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 sm:gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="flex-1 sm:w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={buildingFilter}
              onValueChange={(value) => {
                setBuildingFilter(value);
                setAreaFilter('all');
              }}
            >
              <SelectTrigger className="flex-1 sm:w-48">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {scopedBuildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="flex-1 sm:w-48">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {filterAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={Boolean(editingIncident)} onOpenChange={(open) => !open && setEditingIncident(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            {editingIncident && (
              <IncidentEditForm
                incident={editingIncident}
                onSave={(updates) => handleEditSave(editingIncident.id, updates)}
                onCancel={() => setEditingIncident(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Incidents List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filteredIncidents.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No incidents found
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const location = getLocationName(incident);
                const StatusIcon = statusStyles[incident.status].icon;
                return (
                  <div
                    key={incident.id}
                    className={cn(
                      'px-4 sm:px-6 py-4 transition-colors border-l-4 hover:brightness-[0.98]',
                      statusStyles[incident.status].row,
                    )}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={cn(
                        'p-2 rounded-lg shrink-0',
                        statusStyles[incident.status].bg
                      )}>
                        <StatusIcon className={cn('w-4 h-4 sm:w-5 sm:h-5', statusStyles[incident.status].color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{incident.title}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">
                              {incident.description}
                            </p>
                            {incident.rootCause && (
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                Root cause: {incident.rootCause}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start gap-2 shrink-0 self-start">
                            <span className={cn(
                              'inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-full border',
                              severityStyles[incident.severity]
                            )}>
                              {incident.severity}
                            </span>
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-full border bg-background/60 text-foreground">
                              {statusStyles[incident.status].label}
                            </span>
                            {canResolveIncidents && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setEditingIncident(incident)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                          <span className="truncate">{location.area}, {location.floor}, {location.building}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">Reported by {incident.reportedBy}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatDistanceToNow(incident.reportedAt, { addSuffix: true })}</span>
                          {incident.statusDates.inProgressAt && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>In Progress: {formatDistanceToNow(incident.statusDates.inProgressAt, { addSuffix: true })}</span>
                            </>
                          )}
                          {incident.statusDates.closedAt && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>Closed: {formatDistanceToNow(incident.statusDates.closedAt, { addSuffix: true })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
