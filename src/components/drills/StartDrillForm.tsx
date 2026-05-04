import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DrillType } from '@/types/safety';
import { CustomBuilding } from '@/types/admin';
import { Siren, Flame, Mountain, Lock, Users, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartDrillFormProps {
  buildings: CustomBuilding[];
  mode?: 'start' | 'schedule';
  onSubmit: (data: {
    type: DrillType;
    buildingIds: string[];
    floorIds: string[];
    areaIds: string[];
    scheduledFor?: Date;
  }) => void;
  onCancel?: () => void;
}

const drillTypes: { type: DrillType; label: string; icon: typeof Flame; color: string }[] = [
  { type: 'fire', label: 'Fire Drill', icon: Flame, color: 'text-emergency' },
  { type: 'earthquake', label: 'Earthquake', icon: Mountain, color: 'text-warning' },
  { type: 'lockdown', label: 'Lockdown', icon: Lock, color: 'text-primary' },
  { type: 'evacuation', label: 'Evacuation', icon: Users, color: 'text-info' },
  { type: 'medical', label: 'Medical Emergency', icon: Stethoscope, color: 'text-safe' },
];

export function StartDrillForm({ buildings, mode = 'start', onSubmit, onCancel }: StartDrillFormProps) {
  const [drillType, setDrillType] = useState<DrillType>('fire');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [selectedFloorKeys, setSelectedFloorKeys] = useState<string[]>([]);
  const [selectedAreaKeys, setSelectedAreaKeys] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState('');

  const selectedBuildings = useMemo(
    () => buildings.filter((building) => selectedBuildingIds.includes(building.id)),
    [buildings, selectedBuildingIds],
  );

  const availableFloors = useMemo(
    () => selectedBuildings.flatMap((building) => building.floors.map((floor) => ({
      key: `${building.id}::${floor.id}`,
      buildingId: building.id,
      floor,
    }))),
    [selectedBuildings],
  );

  const availableAreas = useMemo(
    () => availableFloors
      .filter((entry) => selectedFloorKeys.includes(entry.key))
      .flatMap((entry) => entry.floor.areas.map((area) => ({
        key: `${entry.buildingId}::${entry.floor.id}::${area.id}`,
        area,
      }))),
    [availableFloors, selectedFloorKeys],
  );

  const availableFloorKeys = useMemo(() => new Set(availableFloors.map((entry) => entry.key)), [availableFloors]);
  const availableAreaKeys = useMemo(() => new Set(availableAreas.map((entry) => entry.key)), [availableAreas]);

  const isScheduling = mode === 'schedule';

  const getBuildingFloorKeys = (building: CustomBuilding) =>
    building.floors.map((floor) => `${building.id}::${floor.id}`);

  const getBuildingAreaKeys = (building: CustomBuilding) =>
    building.floors.flatMap((floor) =>
      floor.areas.map((area) => `${building.id}::${floor.id}::${area.id}`),
    );

  const isEntireBuildingSelected = (building: CustomBuilding) => {
    const buildingFloorKeys = getBuildingFloorKeys(building);
    const buildingAreaKeys = getBuildingAreaKeys(building);

    const floorsSelected = buildingFloorKeys.every((key) => selectedFloorKeys.includes(key));
    const areasSelected = buildingAreaKeys.length === 0
      || buildingAreaKeys.every((key) => selectedAreaKeys.includes(key));

    return floorsSelected && areasSelected;
  };

  const handleToggleEntireBuilding = (buildingId: string) => {
    const building = buildings.find((entry) => entry.id === buildingId);
    if (!building) return;

    const buildingFloorKeys = getBuildingFloorKeys(building);
    const buildingAreaKeys = getBuildingAreaKeys(building);
    const isSelected = isEntireBuildingSelected(building);

    if (isSelected) {
      setSelectedBuildingIds((previous) => previous.filter((id) => id !== buildingId));
      setSelectedFloorKeys((previous) => previous.filter((key) => !buildingFloorKeys.includes(key)));
      setSelectedAreaKeys((previous) => previous.filter((key) => !buildingAreaKeys.includes(key)));
      return;
    }

    setSelectedBuildingIds((previous) => (
      previous.includes(buildingId) ? previous : [...previous, buildingId]
    ));
    setSelectedFloorKeys((previous) => Array.from(new Set([...previous, ...buildingFloorKeys])));
    setSelectedAreaKeys((previous) => Array.from(new Set([...previous, ...buildingAreaKeys])));
  };

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildingIds((previous) => {
      const next = previous.includes(buildingId)
        ? previous.filter((id) => id !== buildingId)
        : [...previous, buildingId];

      const nextFloorKeys = new Set(
        buildings
          .filter((building) => next.includes(building.id))
          .flatMap((building) => building.floors.map((floor) => `${building.id}::${floor.id}`)),
      );

      setSelectedFloorKeys((currentFloorKeys) => {
        const filteredFloorKeys = currentFloorKeys.filter((floorKey) => nextFloorKeys.has(floorKey));
        const nextAreaKeys = new Set(
          buildings
            .filter((building) => next.includes(building.id))
            .flatMap((building) => building.floors.map((floor) => ({
              floorKey: `${building.id}::${floor.id}`,
              floor,
              buildingId: building.id,
            })))
            .filter((entry) => filteredFloorKeys.includes(entry.floorKey))
            .flatMap((entry) => entry.floor.areas.map((area) => `${entry.buildingId}::${entry.floor.id}::${area.id}`)),
        );
        setSelectedAreaKeys((currentAreaKeys) => currentAreaKeys.filter((areaKey) => nextAreaKeys.has(areaKey)));
        return filteredFloorKeys;
      });

      return next;
    });
  };

  const toggleFloor = (floorKey: string) => {
    setSelectedFloorKeys((previous) => {
      const next = previous.includes(floorKey)
        ? previous.filter((key) => key !== floorKey)
        : [...previous, floorKey];

      const nextAreaKeys = new Set(
        availableFloors
          .filter((entry) => next.includes(entry.key))
          .flatMap((entry) => entry.floor.areas.map((area) => `${entry.buildingId}::${entry.floor.id}::${area.id}`)),
      );
      setSelectedAreaKeys((currentAreaKeys) => currentAreaKeys.filter((areaKey) => nextAreaKeys.has(areaKey)));

      return next;
    });
  };

  const toggleArea = (areaKey: string) => {
    setSelectedAreaKeys((previous) => (
      previous.includes(areaKey)
        ? previous.filter((key) => key !== areaKey)
        : [...previous, areaKey]
    ));
  };

  const handleSelectAllBuildings = () => {
    if (selectedBuildingIds.length === buildings.length) {
      setSelectedBuildingIds([]);
      setSelectedFloorKeys([]);
      setSelectedAreaKeys([]);
      return;
    }

    const allBuildingIds = buildings.map((building) => building.id);
    setSelectedBuildingIds(allBuildingIds);
  };

  const handleSelectAllFloors = () => {
    if (availableFloors.length === 0) return;

    const selectedAvailableFloors = selectedFloorKeys.filter((floorKey) => availableFloorKeys.has(floorKey));
    if (selectedAvailableFloors.length === availableFloors.length) {
      setSelectedFloorKeys((previous) => previous.filter((floorKey) => !availableFloorKeys.has(floorKey)));
      setSelectedAreaKeys((previous) => previous.filter((areaKey) => !availableAreaKeys.has(areaKey)));
      return;
    }

    setSelectedFloorKeys((previous) => {
      const next = new Set(previous);
      availableFloors.forEach((entry) => next.add(entry.key));
      return Array.from(next);
    });
  };

  const handleSelectAllAreas = () => {
    if (availableAreas.length === 0) return;

    const selectedAvailableAreas = selectedAreaKeys.filter((areaKey) => availableAreaKeys.has(areaKey));
    if (selectedAvailableAreas.length === availableAreas.length) {
      setSelectedAreaKeys((previous) => previous.filter((areaKey) => !availableAreaKeys.has(areaKey)));
      return;
    }

    setSelectedAreaKeys((previous) => {
      const next = new Set(previous);
      availableAreas.forEach((entry) => next.add(entry.key));
      return Array.from(next);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedFloorIds = Array.from(new Set(
      availableFloors
        .filter((entry) => selectedFloorKeys.includes(entry.key))
        .map((entry) => entry.floor.id),
    ));
    const selectedAreaIds = Array.from(new Set(
      availableAreas
        .filter((entry) => selectedAreaKeys.includes(entry.key))
        .map((entry) => entry.area.id),
    ));

    onSubmit({
      type: drillType,
      buildingIds: selectedBuildingIds,
      floorIds: selectedFloorIds,
      areaIds: selectedAreaIds,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="p-2 gradient-emergency rounded-lg">
          <Siren className="w-5 h-5 text-emergency-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{isScheduling ? 'Schedule Safety Drill' : 'Start Safety Drill'}</h3>
          <p className="text-sm text-muted-foreground">Configure scope across buildings, floors, and sections</p>
        </div>
      </div>

      <div className="space-y-4">
        {!isScheduling && (
          <div className="space-y-3">
            <Label>Drill Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {drillTypes.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDrillType(type)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    drillType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Icon className={cn('w-6 h-6', color)} />
                  <span className="text-xs font-medium text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Buildings</Label>
            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllBuildings}>
              {selectedBuildingIds.length === buildings.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {buildings.map((building) => (
              <label
                key={building.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedBuildingIds.includes(building.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={selectedBuildingIds.includes(building.id)}
                  onCheckedChange={() => toggleBuilding(building.id)}
                />
                <span className="font-medium">{building.name}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {building.floors.length} floors
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleToggleEntireBuilding(building.id);
                  }}
                >
                  {isEntireBuildingSelected(building) ? 'Clear Building' : 'Select Entire Building'}
                </Button>
              </label>
            ))}
          </div>
        </div>

        {selectedBuildingIds.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Floors to Include</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFloors}
              >
                {selectedFloorKeys.filter((floorKey) => availableFloorKeys.has(floorKey)).length === availableFloors.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableFloors.map((entry) => (
                <label
                  key={entry.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedFloorKeys.includes(entry.key)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={selectedFloorKeys.includes(entry.key)}
                    onCheckedChange={() => toggleFloor(entry.key)}
                  />
                  <span className="font-medium">{entry.floor.name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {entry.floor.areas.length} areas
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedFloorKeys.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Sections to Include</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllAreas}
              >
                {selectedAreaKeys.filter((areaKey) => availableAreaKeys.has(areaKey)).length === availableAreas.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableAreas.map((entry) => (
                <label
                  key={entry.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedAreaKeys.includes(entry.key)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={selectedAreaKeys.includes(entry.key)}
                    onCheckedChange={() => toggleArea(entry.key)}
                  />
                  <span className="font-medium">{entry.area.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isScheduling && (
          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Schedule Date & Time</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              required
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          className="flex-1 gap-2 gradient-emergency text-emergency-foreground hover:opacity-90"
          disabled={selectedBuildingIds.length === 0 || (isScheduling && !scheduledFor)}
        >
          <Siren className="w-4 h-4" />
          {isScheduling ? 'Schedule Drill' : 'Start Drill Now'}
        </Button>
      </div>
    </form>
  );
}
