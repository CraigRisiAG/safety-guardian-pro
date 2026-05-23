import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CustomBuilding, UserPermission } from '@/types/admin';
import { AUDIT_LOGS_UPDATED_EVENT, AuditLogEntry, canViewAuditLogByScope, loadAuditLogs } from '@/lib/auditLog';
import { getScopedAreaIds } from '@/lib/personnelAccess';

interface SystemLogsViewerProps {
  permission: UserPermission | null;
  buildings: CustomBuilding[];
}

const actionBadgeClass = (action: string) => {
  if (action.includes('delete') || action.includes('remove') || action.includes('reset')) {
    return 'bg-emergency-muted text-emergency border-emergency/30';
  }

  if (action.includes('create') || action.includes('add') || action.includes('start')) {
    return 'bg-safe-muted text-safe border-safe/30';
  }

  if (action.includes('update') || action.includes('edit') || action.includes('change')) {
    return 'bg-warning-muted text-warning border-warning/30';
  }

  return 'bg-info-muted text-info border-info/30';
};

const getLocationLabel = (entry: AuditLogEntry, buildings: CustomBuilding[]) => {
  if (!entry.location) {
    return 'System-wide';
  }

  const building = buildings.find((item) => item.id === entry.location?.buildingId);
  const floor = building?.floors.find((item) => item.id === entry.location?.floorId);
  const area = floor?.areas.find((item) => item.id === entry.location?.areaId);

  if (building && floor && area) {
    return `${building.name} / ${floor.name} / ${area.name}`;
  }

  if (building && floor) {
    return `${building.name} / ${floor.name}`;
  }

  if (building) {
    return building.name;
  }

  if (entry.location.areaIds?.length) {
    return `${entry.location.areaIds.length} scoped area(s)`;
  }

  return 'Scoped';
};

export function SystemLogsViewer({ permission, buildings }: SystemLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => loadAuditLogs());
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const scopedAreaIds = useMemo(() => new Set(getScopedAreaIds(permission, buildings)), [permission, buildings]);

  useEffect(() => {
    const syncLogs = () => {
      setLogs(loadAuditLogs());
    };

    window.addEventListener('storage', syncLogs);
    window.addEventListener(AUDIT_LOGS_UPDATED_EVENT, syncLogs);

    return () => {
      window.removeEventListener('storage', syncLogs);
      window.removeEventListener(AUDIT_LOGS_UPDATED_EVENT, syncLogs);
    };
  }, []);

  const visibleLogs = useMemo(() => {
    return logs.filter((entry) => canViewAuditLogByScope(permission, scopedAreaIds, entry));
  }, [logs, permission, scopedAreaIds]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleLogs.filter((entry) => {
      const matchesModule = moduleFilter === 'all' || entry.module === moduleFilter;
      const searchable = `${entry.description} ${entry.action} ${entry.actor.name} ${entry.module}`.toLowerCase();
      const matchesSearch = query.length === 0 || searchable.includes(query);

      return matchesModule && matchesSearch;
    });
  }, [visibleLogs, moduleFilter, search]);

  const modules = useMemo(() => {
    return Array.from(new Set(visibleLogs.map((entry) => entry.module))).sort((a, b) => a.localeCompare(b));
  }, [visibleLogs]);

  const roleIsSuperAdmin = permission?.role === 'super_admin';

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Activity Logs
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {roleIsSuperAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-safe" />
              Super Admin view: all system activity
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-info" />
              Admin view: only activity within your assigned areas
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search logs by action, actor, or details"
          />
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="sm:w-60">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {modules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No activity logs available for your scope.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('capitalize border', actionBadgeClass(entry.action))}>
                        {entry.action.replaceAll('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-foreground">{entry.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{entry.module}</div>
                    </TableCell>
                    <TableCell className="text-sm">{entry.actor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getLocationLabel(entry, buildings)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
