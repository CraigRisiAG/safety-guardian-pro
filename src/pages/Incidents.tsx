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
import { Plus, Search, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2, Download, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { loadIncidentsFromStorage, saveIncidentsToStorage } from '@/lib/incidentsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { canResolveIncidentsForUser, findCurrentUserPermission, getScopedAreaIds, isSuperAdminPermission } from '@/lib/personnelAccess';
import { logAuditEvent } from '@/lib/auditLog';

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
  const [statsPeriod, setStatsPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [chartMode, setChartMode] = useState<'status' | 'severity'>('status');

  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1));
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => String(Math.floor(new Date().getMonth() / 3) + 1));

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

  const reportYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    visibleIncidents.forEach((incident) => {
      years.add(new Date(incident.reportedAt).getFullYear());
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [visibleIncidents]);

  const incidentsForPeriod = useMemo(() => {
    const year = Number(selectedYear);
    const month = Number(selectedMonth);
    const quarter = Number(selectedQuarter);

    return visibleIncidents.filter((incident) => {
      const reportedAt = new Date(incident.reportedAt);
      if (reportedAt.getFullYear() !== year) {
        return false;
      }

      if (statsPeriod === 'month') {
        return reportedAt.getMonth() + 1 === month;
      }

      if (statsPeriod === 'quarter') {
        return Math.floor(reportedAt.getMonth() / 3) + 1 === quarter;
      }

      return true;
    });
  }, [visibleIncidents, selectedYear, selectedMonth, selectedQuarter, statsPeriod]);

  const incidentsStats = useMemo(() => {
    return {
      total: incidentsForPeriod.length,
      open: incidentsForPeriod.filter((incident) => incident.status === 'open').length,
      inProgress: incidentsForPeriod.filter((incident) => incident.status === 'in_progress').length,
      closed: incidentsForPeriod.filter((incident) => incident.status === 'closed').length,
      low: incidentsForPeriod.filter((incident) => incident.severity === 'low').length,
      medium: incidentsForPeriod.filter((incident) => incident.severity === 'medium').length,
      high: incidentsForPeriod.filter((incident) => incident.severity === 'high').length,
      critical: incidentsForPeriod.filter((incident) => incident.severity === 'critical').length,
    };
  }, [incidentsForPeriod]);

  const periodLabel = useMemo(() => {
    if (statsPeriod === 'month') {
      const monthDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1);
      return format(monthDate, 'MMMM yyyy');
    }

    if (statsPeriod === 'quarter') {
      return `Q${selectedQuarter} ${selectedYear}`;
    }

    return selectedYear;
  }, [statsPeriod, selectedYear, selectedMonth, selectedQuarter]);

  const periodTrendData = useMemo(() => {
    const createPoint = (label: string) => ({
      label,
      open: 0,
      inProgress: 0,
      closed: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      total: 0,
    });

    if (statsPeriod === 'month') {
      const points = [createPoint('W1'), createPoint('W2'), createPoint('W3'), createPoint('W4'), createPoint('W5')];

      incidentsForPeriod.forEach((incident) => {
        const day = new Date(incident.reportedAt).getDate();
        const weekIndex = Math.min(4, Math.floor((day - 1) / 7));
        const point = points[weekIndex];

        if (incident.status === 'open') point.open += 1;
        if (incident.status === 'in_progress') point.inProgress += 1;
        if (incident.status === 'closed') point.closed += 1;
        if (incident.severity === 'low') point.low += 1;
        if (incident.severity === 'medium') point.medium += 1;
        if (incident.severity === 'high') point.high += 1;
        if (incident.severity === 'critical') point.critical += 1;
        point.total += 1;
      });

      return points;
    }

    if (statsPeriod === 'quarter') {
      const quarterStartMonth = (Number(selectedQuarter) - 1) * 3;
      const points = [0, 1, 2].map((offset) => {
        const date = new Date(Number(selectedYear), quarterStartMonth + offset, 1);
        return createPoint(format(date, 'MMM'));
      });

      incidentsForPeriod.forEach((incident) => {
        const monthIndex = new Date(incident.reportedAt).getMonth() - quarterStartMonth;
        if (monthIndex < 0 || monthIndex > 2) return;
        const point = points[monthIndex];

        if (incident.status === 'open') point.open += 1;
        if (incident.status === 'in_progress') point.inProgress += 1;
        if (incident.status === 'closed') point.closed += 1;
        if (incident.severity === 'low') point.low += 1;
        if (incident.severity === 'medium') point.medium += 1;
        if (incident.severity === 'high') point.high += 1;
        if (incident.severity === 'critical') point.critical += 1;
        point.total += 1;
      });

      return points;
    }

    const points = Array.from({ length: 12 }).map((_, index) => {
      const date = new Date(Number(selectedYear), index, 1);
      return createPoint(format(date, 'MMM'));
    });

    incidentsForPeriod.forEach((incident) => {
      const monthIndex = new Date(incident.reportedAt).getMonth();
      const point = points[monthIndex];

      if (incident.status === 'open') point.open += 1;
      if (incident.status === 'in_progress') point.inProgress += 1;
      if (incident.status === 'closed') point.closed += 1;
      if (incident.severity === 'low') point.low += 1;
      if (incident.severity === 'medium') point.medium += 1;
      if (incident.severity === 'high') point.high += 1;
      if (incident.severity === 'critical') point.critical += 1;
      point.total += 1;
    });

    return points;
  }, [incidentsForPeriod, statsPeriod, selectedQuarter, selectedYear]);

  const customFieldKeyOrder = useMemo(() => {
    const knownFieldIds = settings.customIncidentFields.map((field) => field.id);
    const incidentFieldKeys = Array.from(
      new Set(
        incidentsForPeriod.flatMap((incident) => Object.keys(incident.customFieldValues || {})),
      ),
    );

    const extraFieldKeys = incidentFieldKeys.filter((key) => !knownFieldIds.includes(key));
    return [...knownFieldIds, ...extraFieldKeys];
  }, [settings.customIncidentFields, incidentsForPeriod]);

  const getCustomFieldLabel = (key: string) => {
    const known = settings.customIncidentFields.find((field) => field.id === key);
    return known?.label || key;
  };

  const getLocationNameFromIds = (location: Incident['location']) => {
    const building = settings.buildings.find((item) => item.id === location.buildingId);
    const floor = building?.floors.find((item) => item.id === location.floorId);
    const area = floor?.areas.find((item) => item.id === location.areaId);

    return {
      building: building?.name || 'Unknown building',
      floor: floor?.name || 'Unknown floor',
      area: area?.name || 'Unknown area',
    };
  };

  const downloadIncidentReportCsv = () => {
    if (incidentsForPeriod.length === 0) {
      toast.error('No incidents available for the selected period');
      return;
    }

    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const baseHeaders = [
      'Incident ID',
      'Title',
      'Description',
      'Severity',
      'Status',
      'Reported By',
      'Reported At',
      'Building',
      'Floor',
      'Area',
      'Root Cause',
      'Opened At',
      'In Progress At',
      'Closed At',
    ];
    const customHeaders = customFieldKeyOrder.map((key) => `Custom: ${getCustomFieldLabel(key)}`);
    const headers = [...baseHeaders, ...customHeaders];

    const rows = incidentsForPeriod.map((incident) => {
      const location = getLocationNameFromIds(incident.location);
      const baseValues = [
        incident.id,
        incident.title,
        incident.description,
        incident.severity,
        incident.status,
        incident.reportedBy,
        new Date(incident.reportedAt).toISOString(),
        location.building,
        location.floor,
        location.area,
        incident.rootCause || '',
        new Date(incident.statusDates.openAt).toISOString(),
        incident.statusDates.inProgressAt ? new Date(incident.statusDates.inProgressAt).toISOString() : '',
        incident.statusDates.closedAt ? new Date(incident.statusDates.closedAt).toISOString() : '',
      ];

      const customValues = customFieldKeyOrder.map((key) => {
        const rawValue = incident.customFieldValues?.[key];
        if (rawValue === undefined || rawValue === null) {
          return '';
        }
        return String(rawValue);
      });

      return [...baseValues, ...customValues].map((value) => escapeCsv(value)).join(',');
    });

    const csv = [headers.map((header) => escapeCsv(header)).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');

    link.href = url;
    link.download = `incident-report-${statsPeriod}-${selectedYear}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Downloaded incident report with ${incidentsForPeriod.length} records`);
  };

  const downloadIncidentReportJson = () => {
    if (incidentsForPeriod.length === 0) {
      toast.error('No incidents available for the selected period');
      return;
    }

    const payload = {
      period: {
        mode: statsPeriod,
        label: periodLabel,
        year: selectedYear,
        month: statsPeriod === 'month' ? selectedMonth : null,
        quarter: statsPeriod === 'quarter' ? selectedQuarter : null,
      },
      statistics: incidentsStats,
      incidents: incidentsForPeriod.map((incident) => ({
        ...incident,
        reportedAt: new Date(incident.reportedAt).toISOString(),
        statusDates: {
          openAt: new Date(incident.statusDates.openAt).toISOString(),
          inProgressAt: incident.statusDates.inProgressAt
            ? new Date(incident.statusDates.inProgressAt).toISOString()
            : null,
          closedAt: incident.statusDates.closedAt ? new Date(incident.statusDates.closedAt).toISOString() : null,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');

    link.href = url;
    link.download = `incident-report-${statsPeriod}-${selectedYear}-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Downloaded incident report JSON with ${incidentsForPeriod.length} records`);
  };

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
      customFieldValues?: Record<string, string | boolean | number>;
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
      customFieldValues: updates.customFieldValues ?? incident.customFieldValues,
    };
  };

  const handleSubmit = (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    buildingId: string;
    floorId: string;
    areaId: string;
    customFieldValues: Record<string, string | boolean | number>;
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
      customFieldValues: data.customFieldValues,
    };
    setIncidents((previous) => [newIncident, ...previous]);
    logAuditEvent({
      module: 'incidents',
      action: 'create_incident',
      description: `Created incident "${newIncident.title}"`,
      location: {
        buildingId: newIncident.location.buildingId,
        floorId: newIncident.location.floorId,
        areaId: newIncident.location.areaId,
      },
      metadata: {
        severity: newIncident.severity,
      },
    });
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
      customFieldValues?: Record<string, string | boolean | number>;
    },
  ) => {
    if (!canResolveIncidents) {
      toast.error('You do not have permission to resolve incidents');
      return;
    }

    setIncidents((previous) => {
      const originalIncident = previous.find((incident) => incident.id === incidentId);
      const next = previous.map((incident) =>
        incident.id === incidentId ? buildUpdatedIncident(incident, updates) : incident,
      );

      if (originalIncident) {
        logAuditEvent({
          module: 'incidents',
          action: 'update_incident',
          description: `Updated incident "${originalIncident.title}"`,
          location: {
            buildingId: originalIncident.location.buildingId,
            floorId: originalIncident.location.floorId,
            areaId: originalIncident.location.areaId,
          },
          metadata: {
            status: updates.status,
          },
        });
      }

      return next;
    });
    setEditingIncident(null);
    toast.success('Incident updated successfully');
  };

  const [deletingIncident, setDeletingIncident] = useState<Incident | null>(null);

  const handleDeleteIncident = (incidentId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only System Super Admins can delete incidents');
      return;
    }
    const targetIncident = incidents.find((incident) => incident.id === incidentId);
    setIncidents((previous) => previous.filter((incident) => incident.id !== incidentId));

    if (targetIncident) {
      logAuditEvent({
        module: 'incidents',
        action: 'delete_incident',
        description: `Deleted incident "${targetIncident.title}"`,
        location: {
          buildingId: targetIncident.location.buildingId,
          floorId: targetIncident.location.floorId,
          areaId: targetIncident.location.areaId,
        },
      });
    }

    setDeletingIncident(null);
    toast.success('Incident deleted');
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
                customFields={settings.customIncidentFields}
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

        {/* Incident Statistics & Reports */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Incident Statistics & Reports
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                View incident stats by month, quarter, or year and download reports with all custom fields.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadIncidentReportCsv}>
                <Download className="w-4 h-4 mr-1" />
                Download CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadIncidentReportJson}>
                <Download className="w-4 h-4 mr-1" />
                Download JSON
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select value={statsPeriod} onValueChange={(value: 'month' | 'quarter' | 'year') => setStatsPeriod(value)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">By Month</SelectItem>
                <SelectItem value="quarter">By Quarter</SelectItem>
                <SelectItem value="year">By Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {reportYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {statsPeriod === 'month' && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, index) => {
                    const monthValue = String(index + 1);
                    const monthLabel = format(new Date(Number(selectedYear), index, 1), 'MMMM');
                    return (
                      <SelectItem key={monthValue} value={monthValue}>{monthLabel}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {statsPeriod === 'quarter' && (
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="text-xs sm:text-sm text-muted-foreground">
            Reporting period: <span className="font-medium text-foreground">{periodLabel}</span>
          </div>

          <div className="rounded-lg border border-border p-3 sm:p-4 bg-background/30">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs sm:text-sm font-medium text-foreground">Incident Trend ({periodLabel})</div>
              <div className="flex items-center gap-1 rounded-md border border-border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'status' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setChartMode('status')}
                >
                  By Status
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'severity' ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setChartMode('severity')}
                >
                  By Severity
                </Button>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {chartMode === 'status' ? (
                    <>
                      <Bar dataKey="open" stackId="status" fill="hsl(var(--destructive))" name="Open" />
                      <Bar dataKey="inProgress" stackId="status" fill="hsl(var(--info))" name="In Progress" />
                      <Bar dataKey="closed" stackId="status" fill="hsl(var(--safe))" name="Closed" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="low" stackId="severity" fill="hsl(var(--info))" name="Low" />
                      <Bar dataKey="medium" stackId="severity" fill="hsl(var(--warning))" name="Medium" />
                      <Bar dataKey="high" stackId="severity" fill="hsl(var(--destructive))" name="High" />
                      <Bar dataKey="critical" stackId="severity" fill="hsl(var(--destructive))" name="Critical" />
                    </>
                  )}
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-foreground">{incidentsStats.total}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-lg font-semibold text-emergency">{incidentsStats.open}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-lg font-semibold text-info">{incidentsStats.inProgress}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Closed</p>
              <p className="text-lg font-semibold text-safe">{incidentsStats.closed}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Low Severity</p>
              <p className="text-lg font-semibold text-info">{incidentsStats.low}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Medium Severity</p>
              <p className="text-lg font-semibold text-warning">{incidentsStats.medium}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">High Severity</p>
              <p className="text-lg font-semibold text-emergency">{incidentsStats.high}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Critical Severity</p>
              <p className="text-lg font-semibold text-emergency">{incidentsStats.critical}</p>
            </div>
          </div>
        </div>

        <Dialog open={Boolean(editingIncident)} onOpenChange={(open) => !open && setEditingIncident(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            {editingIncident && (
              <IncidentEditForm
                incident={editingIncident}
                customFields={settings.customIncidentFields}
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
                            {isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-emergency hover:text-emergency"
                                onClick={() => setDeletingIncident(incident)}
                                aria-label="Delete incident"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      <AlertDialog open={Boolean(deletingIncident)} onOpenChange={(open) => !open && setDeletingIncident(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete incident?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingIncident?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingIncident && handleDeleteIncident(deletingIncident.id)}
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

