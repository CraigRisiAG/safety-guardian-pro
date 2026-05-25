import { useMemo, useState } from 'react';
import { Download, FileX2 } from 'lucide-react';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CustomBuilding, SAFETY_ROLE_LABELS, SafetyRole, UserPermission } from '@/types/admin';
import { loadMissedComplianceRecords } from '@/lib/complianceMonitoring';
import { toast } from 'sonner';

interface MissedComplianceReportProps {
  users: UserPermission[];
  buildings: CustomBuilding[];
}

const escapeCsv = (value: string) => {
  const safeValue = value.replaceAll('"', '""');
  return `"${safeValue}"`;
};

const downloadBlob = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export function MissedComplianceReport({ users, buildings }: MissedComplianceReportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | SafetyRole>('all');
  const [areaFilter, setAreaFilter] = useState<'all' | string>('all');

  const areaMap = useMemo(() => {
    const map = new Map<string, { name: string; floorName: string; buildingName: string }>();

    buildings.forEach((building) => {
      building.floors.forEach((floor) => {
        floor.areas.forEach((area) => {
          map.set(area.id, {
            name: area.name,
            floorName: floor.name,
            buildingName: building.name,
          });
        });
      });
    });

    return map;
  }, [buildings]);

  const filteredRows = useMemo(() => {
    const allRows = loadMissedComplianceRecords().filter((entry) => entry.status === 'incomplete');
    const start = startDate ? startOfDay(parseISO(startDate)) : null;
    const end = endDate ? endOfDay(parseISO(endDate)) : null;

    return allRows.filter((row) => {
      if (start && isBefore(row.dueAt, start)) {
        return false;
      }

      if (end && isAfter(row.dueAt, end)) {
        return false;
      }

      if (roleFilter !== 'all' && !row.assignedSafetyRoles.includes(roleFilter)) {
        return false;
      }

      if (areaFilter !== 'all' && !row.areaIds.includes(areaFilter)) {
        return false;
      }

      return true;
    });
  }, [startDate, endDate, roleFilter, areaFilter]);

  const rowsWithDisplay = useMemo(() => {
    return filteredRows.map((row) => {
      const areaLabels = row.areaIds
        .map((areaId) => areaMap.get(areaId))
        .filter((entry): entry is { name: string; floorName: string; buildingName: string } => !!entry)
        .map((entry) => `${entry.buildingName} / ${entry.floorName} / ${entry.name}`);

      const assignedUsers = row.assignedUserIds
        .map((userId) => users.find((user) => user.id === userId || user.userId === userId))
        .filter((entry): entry is UserPermission => !!entry)
        .map((entry) => entry.userName);

      const roleLabels = row.assignedSafetyRoles.map((role) => SAFETY_ROLE_LABELS[role as SafetyRole]);

      return {
        ...row,
        areaLabels,
        assignedUsers,
        roleLabels,
      };
    });
  }, [filteredRows, areaMap, users]);

  const downloadCsv = () => {
    if (rowsWithDisplay.length === 0) {
      toast.error('No missed compliance records to download');
      return;
    }

    const headers = [
      'Check Name',
      'Due Date',
      'Logged At',
      'Category',
      'Assigned Users',
      'Assigned Roles',
      'Areas',
      'Status',
    ];

    const rows = rowsWithDisplay.map((entry) => {
      const values = [
        entry.checkName,
        entry.dueAt.toISOString(),
        entry.loggedAt.toISOString(),
        entry.category,
        entry.assignedUsers.join('; '),
        entry.roleLabels.join('; '),
        entry.areaLabels.join('; '),
        entry.status,
      ];

      return values.map((value) => escapeCsv(String(value))).join(',');
    });

    const csv = [headers.map((header) => escapeCsv(header)).join(','), ...rows].join('\n');
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    downloadBlob(`missed-compliance-report-${stamp}.csv`, csv, 'text/csv;charset=utf-8;');
    toast.success(`Downloaded ${rowsWithDisplay.length} missed compliance records`);
  };

  const downloadJson = () => {
    if (rowsWithDisplay.length === 0) {
      toast.error('No missed compliance records to download');
      return;
    }

    const payload = rowsWithDisplay.map((entry) => ({
      ...entry,
      dueAt: entry.dueAt.toISOString(),
      loggedAt: entry.loggedAt.toISOString(),
    }));

    const json = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    downloadBlob(`missed-compliance-report-${stamp}.json`, json, 'application/json;charset=utf-8;');
    toast.success(`Downloaded ${rowsWithDisplay.length} missed compliance records (JSON)`);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Missed Compliance Report</CardTitle>
        <CardDescription>
          Admin report of missed compliance checks logged as incomplete. Filter by date range, safety role, and office area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="missed-start-date">Start date</Label>
            <Input id="missed-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="missed-end-date">End date</Label>
            <Input id="missed-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Safety role</Label>
            <Select value={roleFilter} onValueChange={(value: 'all' | SafetyRole) => setRoleFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {(Object.keys(SAFETY_ROLE_LABELS) as SafetyRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {SAFETY_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Office area</Label>
            <Select value={areaFilter} onValueChange={(value: 'all' | string) => setAreaFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {Array.from(areaMap.entries()).map(([areaId, entry]) => (
                  <SelectItem key={areaId} value={areaId}>
                    {entry.buildingName} / {entry.floorName} / {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rowsWithDisplay.length}</span> missed records
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadCsv}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={downloadJson}>
              <Download className="w-4 h-4 mr-2" />
              Download JSON
            </Button>
          </div>
        </div>

        {rowsWithDisplay.length === 0 ? (
          <div className="border border-border rounded-lg py-10 text-center text-muted-foreground">
            <FileX2 className="w-8 h-8 mx-auto mb-2" />
            No missed records match these filters.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {rowsWithDisplay.map((row) => (
              <div key={row.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="font-medium text-sm">{row.checkName}</div>
                  <Badge variant="destructive">Incomplete</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Due: {format(row.dueAt, 'MMM d, yyyy')}</div>
                  <div>Logged: {format(row.loggedAt, 'MMM d, yyyy')}</div>
                  <div>Roles: {row.roleLabels.length ? row.roleLabels.join(', ') : 'None'}</div>
                  <div>Users: {row.assignedUsers.length ? row.assignedUsers.join(', ') : 'None'}</div>
                </div>
                {row.areaLabels.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Areas: {row.areaLabels.join(' ; ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
