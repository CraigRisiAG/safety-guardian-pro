import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ALL_WORK_DAYS, CustomBuilding, UserPermission, WORK_DAY_LABELS, WorkDay } from '@/types/admin';

interface HealthOfficialsCoverageSettingsProps {
  requiredDays: WorkDay[];
  onChange: (days: WorkDay[]) => void;
  permissions: UserPermission[];
  buildings: CustomBuilding[];
}

export function HealthOfficialsCoverageSettings({
  requiredDays,
  onChange,
  permissions,
  buildings,
}: HealthOfficialsCoverageSettingsProps) {
  const safetyOfficials = permissions
    .filter((permission) => permission.safetyRoles.length > 0)
    .sort((left, right) => left.userName.localeCompare(right.userName));

  const getBuildingName = (buildingId: string) => {
    return buildings.find((building) => building.id === buildingId)?.name ?? 'Unknown Building';
  };

  const getAreaAssignment = (permission: UserPermission) => {
    if (!permission.primaryAreaId) {
      return 'Not set';
    }

    for (const building of buildings) {
      for (const floor of building.floors) {
        const area = floor.areas.find((candidate) => candidate.id === permission.primaryAreaId);
        if (area) {
          return `${building.name} - ${floor.name} / ${area.name}`;
        }
      }
    }

    return 'Unknown area';
  };

  const getContactDetails = (permission: UserPermission) => {
    const contact = permission.contactDetails;
    if (!contact?.phone && !contact?.mobile) {
      return 'Not provided';
    }

    if (contact.phone && contact.mobile) {
      return `${contact.phone} / ${contact.mobile}`;
    }

    return contact.phone ?? contact.mobile ?? 'Not provided';
  };

  const toggleDay = (day: WorkDay) => {
    const isIncluded = requiredDays.includes(day);
    const nextDays = isIncluded
      ? requiredDays.filter((entry) => entry !== day)
      : [...requiredDays, day];

    onChange(nextDays);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Officials Coverage Days</CardTitle>
        <CardDescription>
          Configure health and safety coverage requirements and view assigned officials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="coverage-days" className="space-y-4">
          <TabsList>
            <TabsTrigger value="coverage-days">Coverage Days</TabsTrigger>
            <TabsTrigger value="officials-list">Officials Contact List</TabsTrigger>
          </TabsList>

          <TabsContent value="coverage-days" className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {ALL_WORK_DAYS.map((day) => {
                const selected = requiredDays.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-center"
                    onClick={() => toggleDay(day)}
                  >
                    {WORK_DAY_LABELS[day]}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Required days selected: {requiredDays.length}
            </p>
          </TabsContent>

          <TabsContent value="officials-list" className="space-y-3">
            {safetyOfficials.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No safety officials assigned yet.
              </div>
            ) : (
              <div className="space-y-3">
                {safetyOfficials.map((official) => (
                  <div key={official.id} className="rounded-md border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{official.userName}</p>
                        <p className="text-sm text-muted-foreground">{official.email}</p>
                      </div>
                      <Badge variant="secondary">
                        {official.safetyRoles.length > 1 ? 'Safety Official Roles' : 'Safety Official'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Assigned Areas</p>
                        <p className="text-foreground">{getAreaAssignment(official)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Building Access</p>
                        <p className="text-foreground">
                          {official.buildingAccess.length > 0
                            ? official.buildingAccess.map((buildingId) => getBuildingName(buildingId)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Contact Details</p>
                        <p className="text-foreground">{getContactDetails(official)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
