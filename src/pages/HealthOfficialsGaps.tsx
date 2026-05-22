import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_SAFETY_ROLES,
  ALL_WORK_DAYS,
  SafetyRole,
  SAFETY_ROLE_LABELS,
  WORK_DAY_LABELS,
  UserPermission,
  WorkDay,
} from '@/types/admin';
import {
  findCurrentUserPermission,
  getScopedAreaIds,
  isSuperAdminPermission,
} from '@/lib/personnelAccess';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type GapCell = {
  day: WorkDay;
  isRequired: boolean;
  requiredCount: number;
  assignedCount: number;
  gapCount: number;
  peopleInArea: UserPermission[];
  roleAssignees: UserPermission[];
};

type RoleRow = {
  roleKey: SafetyRole;
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

type SelectedCell = {
  areaName: string;
  floorName: string;
  buildingName: string;
  roleKey: SafetyRole;
  cell: GapCell;
};

type SelectedArea = {
  areaName: string;
  floorName: string;
  buildingName: string;
  people: UserPermission[];
};

export default function HealthOfficialsGaps() {
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);

  const currentPermission = useMemo(
    () => findCurrentUserPermission(user, settings.userPermissions),
    [user, settings.userPermissions],
  );
  const isSuperAdmin = isSuperAdminPermission(currentPermission);
  const scopedAreaIds = useMemo(
    () => new Set(getScopedAreaIds(currentPermission, settings.buildings)),
    [currentPermission, settings.buildings],
  );
  const requiredDays = useMemo<WorkDay[]>(
    () => (settings.healthOfficialsRequiredDays?.length ? settings.healthOfficialsRequiredDays : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
    [settings.healthOfficialsRequiredDays],
  );
  const requiredDaysSet = useMemo(() => new Set(requiredDays), [requiredDays]);

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
            const roleAssignees = usersInAreaForDay.filter((person) => person.safetyRoles.includes(roleKey));
            const isRequired = requiredDaysSet.has(day);

            const headcount = area.expectedHeadcount ?? usersInAreaForDay.length;
            const requiredCount = isRequired ? Math.max(1, Math.ceil(Math.max(headcount, 1) / 100)) : 0;
            const assignedCount = roleAssignees.length;
            const gapCount = isRequired ? Math.max(requiredCount - assignedCount, 0) : 0;

            return {
              day,
              isRequired,
              requiredCount,
              assignedCount,
              gapCount,
              peopleInArea: usersInAreaForDay,
              roleAssignees,
            };
          });

          return {
            roleKey,
            cells,
            totalGap: cells.reduce((sum, cell) => (cell.isRequired ? sum + cell.gapCount : sum), 0),
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
  }, [isSuperAdmin, requiredDaysSet, scopedAreaIds, settings.buildings, settings.userPermissions]);

  const summary = useMemo(() => {
    const totalAreas = areaRows.length;
    const totalCells = areaRows.reduce(
      (sum, area) =>
        sum +
        area.roleRows.reduce(
          (roleSum, role) => roleSum + role.cells.filter((cell) => cell.isRequired).length,
          0,
        ),
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
          <p className="text-xs text-muted-foreground mt-2">
            Required days: {requiredDays.map((day) => WORK_DAY_LABELS[day]).join(', ')}
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
          <span className="inline-block w-3 h-3 rounded-sm bg-muted border border-border ml-4" /> Not required day
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
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => {
                        const people = settings.userPermissions.filter((person) => person.primaryAreaId === area.areaId);
                        setSelectedArea({
                          areaName: area.areaName,
                          floorName: area.floorName,
                          buildingName: area.buildingName,
                          people,
                        });
                      }}
                    >
                      <CardTitle className="text-base hover:underline">{area.areaName}</CardTitle>
                    </button>
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
                              const hasPeopleInArea = cell.peopleInArea.length > 0;
                              const isNotRequired = !cell.isRequired;
                              return (
                                <td key={`${row.roleKey}-${cell.day}`} className="py-2 px-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedCell({
                                        areaName: area.areaName,
                                        floorName: area.floorName,
                                        buildingName: area.buildingName,
                                        roleKey: row.roleKey,
                                        cell,
                                      })
                                    }
                                    className={`w-full rounded-md border px-2 py-1 text-center text-xs font-medium transition-colors ${
                                      isNotRequired
                                        ? 'bg-muted text-muted-foreground border-border'
                                        : hasGap
                                          ? 'bg-emergency-muted text-emergency border-emergency/30'
                                          : hasPeopleInArea
                                            ? 'bg-safe-muted text-safe border-safe/30'
                                            : 'bg-muted text-muted-foreground border-border'
                                    }`}
                                    title={
                                      isNotRequired
                                        ? 'Not required on this day'
                                        : `Required ${cell.requiredCount}, Assigned ${cell.assignedCount}, Gap ${cell.gapCount}`
                                    }
                                  >
                                    {isNotRequired ? 'N/A' : hasGap ? `Gap ${cell.gapCount}` : 'Covered'}
                                  </button>
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

      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCell
                ? `${selectedCell.areaName} • ${WORK_DAY_LABELS[selectedCell.cell.day]} • ${SAFETY_ROLE_LABELS[selectedCell.roleKey]}`
                : 'Coverage details'}
            </DialogTitle>
          </DialogHeader>

          {selectedCell && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedCell.floorName}, {selectedCell.buildingName}
              </p>

              {!selectedCell.cell.isRequired ? (
                <div className="text-sm text-muted-foreground">This day is marked as not required in admin settings.</div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Required: {selectedCell.cell.requiredCount} • Assigned: {selectedCell.cell.assignedCount} • Gap: {selectedCell.cell.gapCount}
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">People in this area/day</h4>
                {selectedCell.cell.peopleInArea.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No people assigned for this area/day.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedCell.cell.peopleInArea.map((person) => (
                      <li key={person.id} className="text-sm text-foreground">
                        {person.userName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  People assigned to {SAFETY_ROLE_LABELS[selectedCell.roleKey]}
                </h4>
                {selectedCell.cell.roleAssignees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No people assigned to this role for the selected area/day.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedCell.cell.roleAssignees.map((person) => (
                      <li key={person.id} className="text-sm text-foreground">
                        {person.userName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedArea} onOpenChange={(open) => !open && setSelectedArea(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedArea ? `${selectedArea.areaName} • Assigned People` : 'Area people'}
            </DialogTitle>
          </DialogHeader>

          {selectedArea && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {selectedArea.floorName}, {selectedArea.buildingName}
              </p>
              {selectedArea.people.length === 0 ? (
                <p className="text-sm text-muted-foreground">No people are currently assigned to this area.</p>
              ) : (
                <ul className="space-y-1">
                  {selectedArea.people.map((person) => (
                    <li key={person.id} className="text-sm text-foreground">
                      {person.userName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
