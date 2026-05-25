import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StartDrillForm } from '@/components/drills/StartDrillForm';
import { DrillDetailDialog } from '@/components/drills/DrillDetailDialog';
import { Drill, DrillType, DrillRecord } from '@/types/safety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Siren, Play, Clock, CheckCircle2, XCircle, MapPin, Calendar, Timer, Users, BarChart3, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { Badge } from '@/components/ui/badge';
import { loadDrillsFromStorage, saveDrillsToStorage } from '@/lib/drillsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { canStartDrillsForUser, findCurrentUserPermission, getScopedAreaIds, isSuperAdminPermission } from '@/lib/personnelAccess';
import { logAuditEvent } from '@/lib/auditLog';

const drillTypeLabels: Record<DrillType, string> = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency',
};

const drillTypeColors: Record<DrillType, string> = {
  fire: 'bg-emergency-muted text-emergency',
  earthquake: 'bg-warning-muted text-warning',
  lockdown: 'bg-primary/10 text-primary',
  evacuation: 'bg-info-muted text-info',
  medical: 'bg-safe-muted text-safe',
};

const statusConfig = {
  scheduled: { icon: Calendar, color: 'text-info', bg: 'bg-info-muted', label: 'Scheduled' },
  missed: { icon: XCircle, color: 'text-emergency', bg: 'bg-emergency-muted', label: 'Missed' },
  active: { icon: Play, color: 'text-emergency', bg: 'bg-emergency-muted', label: 'Active' },
  completed: { icon: CheckCircle2, color: 'text-safe', bg: 'bg-safe-muted', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-emergency', bg: 'bg-emergency-muted', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled' },
};

const DRILL_FAILURE_MIN_CHECKIN_RATE = 50;

const isMissedDrill = (drill: Drill) =>
  drill.status === 'scheduled' &&
  !!drill.scheduledFor &&
  isBefore(drill.scheduledFor, new Date());

const getSafeBuildingIds = (drill: Drill): string[] => {
  if (Array.isArray(drill.location.buildingIds) && drill.location.buildingIds.length > 0) {
    return drill.location.buildingIds;
  }
  return drill.location.buildingId ? [drill.location.buildingId] : [];
};

const getSafeFloorIds = (drill: Drill): string[] => {
  return Array.isArray(drill.location.floorIds) ? drill.location.floorIds : [];
};

const getSafeAreaIds = (drill: Drill): string[] => {
  return Array.isArray(drill.location.areaIds) ? drill.location.areaIds : [];
};

const normalizeDrillRecord = (record: DrillRecord): DrillRecord => {
  const startedAt = new Date(record.startedAt);
  const completedAt = new Date(record.completedAt);
  const safeStartedAt = Number.isNaN(startedAt.getTime()) ? new Date() : startedAt;
  const safeCompletedAt = Number.isNaN(completedAt.getTime()) ? safeStartedAt : completedAt;

  const checkInStats = record.checkInStats || { total: 0, safe: 0, needsAssistance: 0, pending: 0 };
  const floors = Array.isArray(record.floors) ? record.floors : [];
  const floorStats = Array.isArray(record.floorStats) ? record.floorStats : [];

  return {
    ...record,
    type: record.type || 'fire',
    buildingName: record.buildingName || 'Unknown',
    initiatedBy: record.initiatedBy || 'Unknown',
    floors,
    checkInStats: {
      total: Number.isFinite(checkInStats.total) ? checkInStats.total : 0,
      safe: Number.isFinite(checkInStats.safe) ? checkInStats.safe : 0,
      needsAssistance: Number.isFinite(checkInStats.needsAssistance) ? checkInStats.needsAssistance : 0,
      pending: Number.isFinite(checkInStats.pending) ? checkInStats.pending : 0,
    },
    floorStats,
    durationMinutes: Number.isFinite(record.durationMinutes) ? record.durationMinutes : 0,
    startedAt: safeStartedAt,
    completedAt: safeCompletedAt,
  };
};

const getCheckInRate = (record: DrillRecord): number => {
  const total = record.checkInStats.total;
  if (total <= 0) {
    return 100;
  }

  const checkedIn = Math.max(0, total - record.checkInStats.pending);
  return (checkedIn / total) * 100;
};

const isFailedDrillRecord = (record: DrillRecord): boolean => {
  return getCheckInRate(record) < DRILL_FAILURE_MIN_CHECKIN_RATE;
};

export default function Drills() {
  const [drills, setDrills] = useState<Drill[]>(() => loadDrillsFromStorage());
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<DrillRecord | null>(null);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyDatePreset, setHistoryDatePreset] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const { startDrill, endDrill, drillRecords } = useDrillStatus();
  const { settings } = useAdminSettings();
  const { user } = useAuth();

  const currentPermission = useMemo(
    () => findCurrentUserPermission(user, settings.userPermissions),
    [user, settings.userPermissions],
  );
  const canStartDrills = canStartDrillsForUser(currentPermission);
  const isSuperAdmin = isSuperAdminPermission(currentPermission);
  const scopedAreaIds = useMemo(
    () => new Set(getScopedAreaIds(currentPermission, settings.buildings)),
    [currentPermission, settings.buildings],
  );

  useEffect(() => {
    const now = new Date();
    const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd');

    if (historyDatePreset === 'all') {
      setHistoryStartDate('');
      setHistoryEndDate('');
      return;
    }

    if (historyDatePreset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setHistoryStartDate(toInputDate(start));
      setHistoryEndDate(toInputDate(now));
      return;
    }

    if (historyDatePreset === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setHistoryStartDate(toInputDate(start));
      setHistoryEndDate(toInputDate(now));
      return;
    }

    if (historyDatePreset === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      setHistoryStartDate(toInputDate(start));
      setHistoryEndDate(toInputDate(now));
    }
  }, [historyDatePreset]);

  const visibleBuildings = useMemo(() => {
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

  useEffect(() => {
    saveDrillsToStorage(drills);
  }, [drills]);

  const handleStartDrill = (data: {
    type: DrillType;
    buildingIds: string[];
    floorIds: string[];
    areaIds: string[];
  }) => {
    if (!canStartDrills) {
      toast.error('You do not have permission to start drills');
      return;
    }
    const primaryBuildingId = data.buildingIds[0];
    if (!primaryBuildingId) {
      return;
    }

    const newDrill: Drill = {
      id: `drill-${Date.now()}`,
      type: data.type,
      status: 'active',
      location: {
        buildingId: primaryBuildingId,
        floorIds: data.floorIds,
        areaIds: data.areaIds,
        buildingIds: data.buildingIds,
      },
      startedAt: new Date(),
      initiatedBy: 'Safety Officer',
    };
    setDrills((previous) => [newDrill, ...previous]);
    logAuditEvent({
      module: 'drills',
      action: 'start_drill',
      description: `Started ${drillTypeLabels[data.type]}`,
      location: {
        buildingId: newDrill.location.buildingId,
        areaIds: newDrill.location.areaIds,
      },
      metadata: {
        type: data.type,
      },
    });
    startDrill(newDrill);
    setIsStartDialogOpen(false);
    toast.success(`${drillTypeLabels[data.type]} started!`);
  };

  const handleScheduleDrill = (data: {
    type: DrillType;
    buildingIds: string[];
    floorIds: string[];
    areaIds: string[];
    scheduledFor?: Date;
  }) => {
    if (!canStartDrills) {
      toast.error('You do not have permission to schedule drills');
      return;
    }
    const primaryBuildingId = data.buildingIds[0];
    if (!primaryBuildingId || !data.scheduledFor) {
      return;
    }

    const newDrill: Drill = {
      id: `drill-${Date.now()}`,
      type: data.type,
      status: 'scheduled',
      location: {
        buildingId: primaryBuildingId,
        floorIds: data.floorIds,
        areaIds: data.areaIds,
        buildingIds: data.buildingIds,
      },
      scheduledFor: data.scheduledFor,
      initiatedBy: 'Safety Officer',
    };

    setDrills((previous) => [newDrill, ...previous]);
    logAuditEvent({
      module: 'drills',
      action: 'schedule_drill',
      description: `Scheduled ${drillTypeLabels[data.type]}`,
      location: {
        buildingId: newDrill.location.buildingId,
        areaIds: newDrill.location.areaIds,
      },
      metadata: {
        type: data.type,
      },
    });
    setIsScheduleDialogOpen(false);
    toast.success(`${drillTypeLabels[data.type]} scheduled`);
  };

  const handleEndDrill = (drillId: string) => {
    const targetDrill = drills.find((entry) => entry.id === drillId);
    endDrill();
    setDrills(drills.map(d => 
      d.id === drillId 
        ? { ...d, status: 'completed', completedAt: new Date() } 
        : d
    ));

    if (targetDrill) {
      logAuditEvent({
        module: 'drills',
        action: 'end_drill',
        description: `Ended ${drillTypeLabels[targetDrill.type]}`,
        location: {
          buildingId: targetDrill.location.buildingId,
          areaIds: targetDrill.location.areaIds,
        },
      });
    }

    toast.success('Drill ended successfully');
  };

  const scopedDrills = drills.filter((drill) => {
    if (isSuperAdmin) {
      return true;
    }

    const areaIds = getSafeAreaIds(drill);
    if (areaIds.length > 0) {
      return areaIds.some((areaId) => scopedAreaIds.has(areaId));
    }

    const selectedBuildingIds = getSafeBuildingIds(drill);
    return visibleBuildings.some((building) => selectedBuildingIds.includes(building.id));
  });

  const getLocationDisplay = (drill: Drill) => {
    const selectedBuildingIds = getSafeBuildingIds(drill);
    const selectedBuildings = settings.buildings.filter((building) => selectedBuildingIds.includes(building.id));
    const buildingNames = selectedBuildings.map((building) => building.name).join(', ');
    const allFloors = selectedBuildings.flatMap((building) => building.floors);
    const floors = allFloors.filter((floor) => getSafeFloorIds(drill).includes(floor.id));
    return {
      building: buildingNames || 'Unknown',
      floors: floors.map(f => f.name).join(', ') || 'All floors',
    };
  };

  const normalizedHistoryRecords = useMemo(() => {
    return drillRecords.map((record) => normalizeDrillRecord(record));
  }, [drillRecords]);

  const failedDrillIds = useMemo(() => {
    return new Set(
      normalizedHistoryRecords
        .filter((record) => isFailedDrillRecord(record))
        .map((record) => record.drillId),
    );
  }, [normalizedHistoryRecords]);

  const filteredDrills = scopedDrills.filter((drill) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'history') return false;
    if (activeTab === 'failed') return drill.status === 'completed' && failedDrillIds.has(drill.id);
    if (activeTab === 'missed') return isMissedDrill(drill);
    if (activeTab === 'scheduled') return drill.status === 'scheduled' && !isMissedDrill(drill);
    return drill.status === activeTab;
  });

  const filteredHistoryRecords = useMemo(() => {
    return normalizedHistoryRecords.filter((record) => {
      const completedAt = new Date(record.completedAt);

      if (historyStartDate) {
        const start = new Date(`${historyStartDate}T00:00:00`);
        if (completedAt < start) {
          return false;
        }
      }

      if (historyEndDate) {
        const end = new Date(`${historyEndDate}T23:59:59.999`);
        if (completedAt > end) {
          return false;
        }
      }

      return true;
    });
  }, [normalizedHistoryRecords, historyStartDate, historyEndDate]);

  const downloadDrillHistoryCsv = () => {
    if (filteredHistoryRecords.length === 0) {
      toast.error('No drill history records available to download');
      return;
    }

    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const headers = [
      'Record ID',
      'Drill ID',
      'Type',
      'Building',
      'Initiated By',
      'Started At',
      'Completed At',
      'Duration Minutes',
      'Total Personnel',
      'Safe',
      'Needed Assistance',
      'Unaccounted',
      'Response Rate (%)',
      'Safe Rate (%)',
      'Floors',
      'Floor Breakdown',
    ];

    const rows = filteredHistoryRecords.map((record) => {
      const total = record.checkInStats.total;
      const responseRate = total > 0 ? Math.round(((total - record.checkInStats.pending) / total) * 100) : 0;
      const safeRate = total > 0 ? Math.round((record.checkInStats.safe / total) * 100) : 0;
      const floorNames = record.floors.map((floor) => floor.name).join(', ');
      const floorBreakdown = (Array.isArray(record.floorStats) ? record.floorStats : [])
        .map((floor) => `${floor.floorName}: safe=${floor.safe}, help=${floor.needsAssistance}, pending=${floor.pending}`)
        .join(' | ');

      const values = [
        record.id,
        record.drillId,
        drillTypeLabels[record.type],
        record.buildingName,
        record.initiatedBy,
        new Date(record.startedAt).toISOString(),
        new Date(record.completedAt).toISOString(),
        String(record.durationMinutes),
        String(record.checkInStats.total),
        String(record.checkInStats.safe),
        String(record.checkInStats.needsAssistance),
        String(record.checkInStats.pending),
        String(responseRate),
        String(safeRate),
        floorNames,
        floorBreakdown,
      ];

      return values.map((value) => escapeCsv(value)).join(',');
    });

    const csv = [headers.map((header) => escapeCsv(header)).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');

    link.href = url;
    link.download = `drill-history-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Downloaded ${filteredHistoryRecords.length} drill history records`);
  };

  const downloadDrillHistoryJson = () => {
    if (filteredHistoryRecords.length === 0) {
      toast.error('No drill history records available to download');
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      count: filteredHistoryRecords.length,
      records: filteredHistoryRecords.map((record) => ({
        ...record,
        startedAt: new Date(record.startedAt).toISOString(),
        completedAt: new Date(record.completedAt).toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');

    link.href = url;
    link.download = `drill-history-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`Downloaded ${filteredHistoryRecords.length} drill history records (JSON)`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Drill Management</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage safety drills</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!canStartDrills}>
                  <Calendar className="w-4 h-4" />
                  Schedule Drill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <StartDrillForm
                  buildings={visibleBuildings}
                  mode="schedule"
                  onSubmit={handleScheduleDrill}
                  onCancel={() => setIsScheduleDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 gradient-emergency text-emergency-foreground hover:opacity-90" disabled={!canStartDrills}>
                  <Siren className="w-4 h-4" />
                  Start Drill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <StartDrillForm
                  buildings={visibleBuildings}
                  onSubmit={handleStartDrill}
                  onCancel={() => setIsStartDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Drills</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <BarChart3 className="w-3 h-3" />
              History & Stats
            </TabsTrigger>
          </TabsList>

          {/* Drill History Tab */}
          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Preset</label>
                    <Select
                      value={historyDatePreset}
                      onValueChange={(value: 'all' | 'week' | 'month' | 'year' | 'custom') => setHistoryDatePreset(value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Preset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={historyStartDate}
                      onChange={(event) => {
                        setHistoryDatePreset('custom');
                        setHistoryStartDate(event.target.value);
                      }}
                      className="w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={historyEndDate}
                      onChange={(event) => {
                        setHistoryDatePreset('custom');
                        setHistoryEndDate(event.target.value);
                      }}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHistoryDatePreset('all');
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="h-9"
                  >
                    Clear
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={downloadDrillHistoryCsv}>
                  <Download className="w-4 h-4 mr-1" />
                  Download CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDrillHistoryJson}>
                  <Download className="w-4 h-4 mr-1" />
                  Download JSON
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Showing {filteredHistoryRecords.length} of {normalizedHistoryRecords.length} drill record(s)
              </div>
              <div className="text-xs text-muted-foreground">
                Failed drill criteria: accounted-for percentage below 50% of uploaded personnel.
              </div>

              {filteredHistoryRecords.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No drill records in selected range</p>
                  <p className="text-sm mt-1">Adjust the date range or clear filters to view all history</p>
                </div>
              ) : (
                filteredHistoryRecords.map((record) => (
                  <div
                    key={record.id}
                    className={cn(
                      'bg-card border border-border rounded-xl p-6 cursor-pointer hover:shadow-md transition-all',
                      isFailedDrillRecord(record) && 'border-emergency/40 bg-emergency-muted/20',
                    )}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-lg', drillTypeColors[record.type])}>
                          <Siren className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {drillTypeLabels[record.type]}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {record.buildingName}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {format(record.startedAt, 'PPP')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Initiated by {record.initiatedBy}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          isFailedDrillRecord(record) && 'bg-emergency-muted text-emergency border border-emergency/30',
                        )}
                      >
                        {isFailedDrillRecord(record) ? 'Failed' : 'Completed'}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
                          <Timer className="w-4 h-4" />
                          {record.durationMinutes < 1 
                            ? `${Math.round(record.durationMinutes * 60)}s` 
                            : `${record.durationMinutes}m`}
                        </div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <div className="bg-safe-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-safe">{record.checkInStats.safe}</div>
                        <p className="text-xs text-muted-foreground">Safe</p>
                      </div>
                      <div className="bg-warning-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-warning">{record.checkInStats.needsAssistance}</div>
                        <p className="text-xs text-muted-foreground">Needed Help</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-muted-foreground">{record.checkInStats.pending}</div>
                        <p className="text-xs text-muted-foreground">Unaccounted</p>
                      </div>
                    </div>

                    {/* Floor Breakdown */}
                    {Array.isArray(record.floorStats) && record.floorStats.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Floor Breakdown
                        </p>
                        <div className="grid gap-2">
                          {record.floorStats.map((fs) => (
                            <div key={fs.floorId} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                              <span className="font-medium text-foreground">{fs.floorName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-safe">{fs.safe} safe</span>
                                {fs.needsAssistance > 0 && (
                                  <span className="text-warning">{fs.needsAssistance} help</span>
                                )}
                                {fs.pending > 0 && (
                                  <span className="text-muted-foreground">{fs.pending} pending</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time details */}
                    <div className="border-t border-border pt-3 mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Started: {format(record.startedAt, 'PPp')}</span>
                      <span>Ended: {format(record.completedAt, 'PPp')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Other tabs */}
          {['all', 'active', 'scheduled', 'missed', 'completed', 'failed'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <div className="grid gap-4">
                {filteredDrills.length === 0 ? (
                  <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    No drills found
                  </div>
                ) : (
                  filteredDrills.map((drill) => {
                    const matchingRecord = normalizedHistoryRecords.find((record) => record.drillId === drill.id);
                    const isFailedCompletedDrill = drill.status === 'completed' && !!matchingRecord && isFailedDrillRecord(matchingRecord);
                    const statusKey = isMissedDrill(drill) ? 'missed' : isFailedCompletedDrill ? 'failed' : drill.status;
                    const status = statusConfig[statusKey as keyof typeof statusConfig];
                    const StatusIcon = status.icon;
                    const location = getLocationDisplay(drill);
                    const accountedRate = matchingRecord ? Math.round(getCheckInRate(matchingRecord)) : null;
                    const accountedCount = matchingRecord
                      ? Math.max(0, matchingRecord.checkInStats.total - matchingRecord.checkInStats.pending)
                      : null;
                    
                    return (
                      <div 
                        key={drill.id} 
                        className={cn(
                          'bg-card border border-border rounded-xl p-6 transition-all hover:shadow-md',
                          drill.status === 'active' && 'ring-2 ring-emergency/50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={cn('p-3 rounded-lg', drillTypeColors[drill.type])}>
                              <Siren className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-foreground">
                                  {drillTypeLabels[drill.type]}
                                </h3>
                                <span className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                                  status.bg, status.color
                                )}>
                                  <StatusIcon className="w-3 h-3" />
                                  {status.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" />
                                  {location.building}
                                </span>
                                <span>•</span>
                                <span>{location.floors}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  {drill.startedAt 
                                    ? `Started ${formatDistanceToNow(drill.startedAt, { addSuffix: true })}`
                                    : drill.scheduledFor
                                    ? `Scheduled for ${format(drill.scheduledFor, 'PPp')}`
                                    : 'Not scheduled'
                                  }
                                </span>
                              </div>
                              {isFailedCompletedDrill && matchingRecord && accountedRate !== null && accountedCount !== null && (
                                <p className="text-xs text-emergency mt-1">
                                  Accounted: {accountedRate}% ({accountedCount}/{matchingRecord.checkInStats.total})
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {drill.status === 'active' && canStartDrills && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEndDrill(drill.id)}
                              >
                                End Drill
                              </Button>
                            )}
                            {drill.status === 'scheduled' && canStartDrills && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const updated = drills.map(d => 
                                    d.id === drill.id 
                                      ? { ...d, status: 'active' as const, startedAt: new Date() } 
                                      : d
                                  );
                                  setDrills(updated);
                                  const activeDrill = updated.find(d => d.id === drill.id)!;
                                  logAuditEvent({
                                    module: 'drills',
                                    action: 'start_scheduled_drill',
                                    description: `Started scheduled ${drillTypeLabels[drill.type]}`,
                                    location: {
                                      buildingId: drill.location.buildingId,
                                      areaIds: getSafeAreaIds(drill),
                                    },
                                    metadata: {
                                      type: drill.type,
                                    },
                                  });
                                  startDrill(activeDrill);
                                  toast.success(`${drillTypeLabels[drill.type]} started!`);
                                }}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Start Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DrillDetailDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
        />
      </div>
    </AppLayout>
  );
}
