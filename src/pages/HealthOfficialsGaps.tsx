import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_SAFETY_ROLES,
  ALL_WORK_DAYS,
  SAFETY_ROLE_LABELS,
  WORK_DAY_LABELS,
  WorkDay,
} from '@/types/admin';
import {
  findCurrentUserPermission,
  getScopedAreaIds,
  isSuperAdminPermission,
} from '@/lib/personnelAccess';

type GapCell = {
  day: WorkDay;
  requiredCount: number;
  assignedCount: number;
  gapCount: number;
};

type RoleRow = {
  roleKey: (typeof ALL_SAFETY_ROLES)[number];
  cells: GapCell[];
  totalGap: number;
};

type AreaRow = {
  areaId: string;
  areaName: string;
  floorName: string;
  buildingName: string;
  expectedHeadcount?: number;
  roleRows: RoleRow[];
};

export default function HealthOfficialsGaps() {
  const { settings } = useAdminSettings();
  const { user } = useAuth();

  const currentPermission = useMemo(
    () => findCurrentUserPermission(user, settings.userPermissions),
    [user, settings.userPermissions],
  );
  const isSuperAdmin = isSuperAdminPermission(currentPermission);
  const scopedAreaIds = useMemo(
    () => new Set(getScopedAreaIds(currentPermission, settings.buildings)),
    [currentPermission, settings.buildings],
  );

  const areaRows = useMemo<AreaRow[]>(() => {
    const allAreas = settings.buildings.flatMap((building) =>
      building.floors.flatMap((floor) =>
        floor.areas.map((area) => ({
          areaId: area.id,
          areaName: area.name,
          floorName: floor.name,
          buildingName: building.name,
          expectedHeadcount: area.expectedHeadcount,
        })),
      ),
    );

    const visibleAreas = isSuperAdmin
      ? allAreas
      : allAreas.filter((area) => scopedAreaIds.has(area.areaId));

    return visibleAreas
      .map((area) => {
        const roleRows: RoleRow[] = ALL_SAFETY_ROLES.map((roleKey) => {
          const cells: GapCell[] = ALL_WORK_DAYS.map((day) => {
            const usersInAreaForDay = settings.userPermissions.filter(
              (person) => person.primaryAreaId === area.areaId && person.workDays.includes(day),
            );

            const headcount = area.expectedHeadcount ?? usersInAreaForDay.length;
            const requiredCount = Math.max(1, Math.ceil(Math.max(headcount, 1) / 100));
            const assignedCount = usersInAreaForDay.filter((person) => person.safetyRoles.includes(roleKey)).length;
            const gapCount = Math.max(requiredCount - assignedCount, 0);

            return {
              day,
              requiredCount,
              assignedCount,
              gapCount,
            };
          });

          return {
            roleKey,
            cells,
            totalGap: cells.reduce((sum, cell) => sum + cell.gapCount, 0),
          };
        });

        return {
          ...area,
          roleRows,
        };
      })
      .sort((left, right) => {
        if (left.buildingName !== right.buildingName) {
          return left.buildingName.localeCompare(right.buildingName);
        }
        if (left.floorName !== right.floorName) {
          return left.floorName.localeCompare(right.floorName);
        }
        return left.areaName.localeCompare(right.areaName);
      });
  }, [isSuperAdmin, scopedAreaIds, settings.buildings, settings.userPermissions]);

  const summary = useMemo(() => {
    const totalAreas = areaRows.length;
    const totalCells = areaRows.reduce(
      (sum, area) => sum + area.roleRows.reduce((roleSum, role) => roleSum + role.cells.length, 0),
      0,
    );
    const gapCells = areaRows.reduce(
      (sum, area) =>
        sum +
        area.roleRows.reduce(
          (roleSum, role) => roleSum + role.cells.filter((cell) => cell.gapCount > 0).length,
          0,
        ),
      0,
    );
    const totalGapCount = areaRows.reduce(
      (sum, area) => sum + area.roleRows.reduce((roleSum, role) => roleSum + role.totalGap, 0),
      0,
    );

    return {
      totalAreas,
      totalCells,
      gapCells,
      coveredCells: Math.max(totalCells - gapCells, 0),
      totalGapCount,
    };
  }, [areaRows]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health Officials Coverage Map</h1>
          <p className="text-muted-foreground mt-1">
            Areas are listed vertically, days run horizontally, and each role/day cell shows coverage in green (covered) or red (gap).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Areas in scope</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{summary.totalAreas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Covered role/day cells</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-safe">{summary.coveredCells}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total official gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emergency">{summary.totalGapCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-3 h-3 rounded-sm bg-safe-muted border border-safe/30" /> Covered
          <span className="inline-block w-3 h-3 rounded-sm bg-emergency-muted border border-emergency/30 ml-4" /> Gap detected
        </div>

        {areaRows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No area data available for your current scope.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {areaRows.map((area) => (
              <Card key={area.areaId}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{area.areaName}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {area.floorName}, {area.buildingName}
                    </span>
                    {typeof area.expectedHeadcount === 'number' && (
                      <Badge variant="outline">Headcount {area.expectedHeadcount}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Role</th>
                          {ALL_WORK_DAYS.map((day) => (
                            <th key={day} className="text-center py-2 px-2 font-medium text-muted-foreground">
                              {WORK_DAY_LABELS[day]}
                            </th>
                          ))}
                          <th className="text-center py-2 pl-3 font-medium text-muted-foreground">Total Gaps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.roleRows.map((row) => (
                          <tr key={row.roleKey} className="border-b border-border/60 last:border-b-0">
                            <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">
                              {SAFETY_ROLE_LABELS[row.roleKey]}
                            </td>
                            {row.cells.map((cell) => {
                              const hasGap = cell.gapCount > 0;
                              return (
                                <td key={`${row.roleKey}-${cell.day}`} className="py-2 px-2">
                                  <div
                                    className={`rounded-md border px-2 py-1 text-center text-xs font-medium ${
                                      hasGap
                                        ? 'bg-emergency-muted text-emergency border-emergency/30'
                                        : 'bg-safe-muted text-safe border-safe/30'
                                    }`}
                                    title={`Required ${cell.requiredCount}, Assigned ${cell.assignedCount}, Gap ${cell.gapCount}`}
                                  >
                                    {hasGap ? `Gap ${cell.gapCount}` : 'Covered'}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="py-2 pl-3 text-center">
                              <Badge variant="outline" className={row.totalGap > 0 ? 'bg-emergency-muted text-emergency' : 'bg-safe-muted text-safe'}>
                                {row.totalGap}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
