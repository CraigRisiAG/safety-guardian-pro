import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildings } from '@/data/mockData';
import { DrillType } from '@/types/safety';
import { Siren, Flame, Mountain, Lock, Users, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartDrillFormProps {
  onSubmit: (data: {
    type: DrillType;
    buildingId: string;
    floorIds: string[];
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

export function StartDrillForm({ onSubmit, onCancel }: StartDrillFormProps) {
  const [drillType, setDrillType] = useState<DrillType>('fire');
  const [buildingId, setBuildingId] = useState('');
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);

  const selectedBuilding = buildings.find(b => b.id === buildingId);

  const handleFloorToggle = (floorId: string) => {
    setSelectedFloors(prev => 
      prev.includes(floorId)
        ? prev.filter(id => id !== floorId)
        : [...prev, floorId]
    );
  };

  const handleSelectAllFloors = () => {
    if (selectedBuilding) {
      if (selectedFloors.length === selectedBuilding.floors.length) {
        setSelectedFloors([]);
      } else {
        setSelectedFloors(selectedBuilding.floors.map(f => f.id));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ type: drillType, buildingId, floorIds: selectedFloors });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="p-2 gradient-emergency rounded-lg">
          <Siren className="w-5 h-5 text-emergency-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Start Safety Drill</h3>
          <p className="text-sm text-muted-foreground">Configure and initiate a drill</p>
        </div>
      </div>

      <div className="space-y-4">
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

        <div className="space-y-2">
          <Label>Building</Label>
          <Select 
            value={buildingId} 
            onValueChange={(v) => { setBuildingId(v); setSelectedFloors([]); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select building" />
            </SelectTrigger>
            <SelectContent>
              {buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBuilding && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Floors to Include</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFloors}
              >
                {selectedFloors.length === selectedBuilding.floors.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedBuilding.floors.map(floor => (
                <label
                  key={floor.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedFloors.includes(floor.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={selectedFloors.includes(floor.id)}
                    onCheckedChange={() => handleFloorToggle(floor.id)}
                  />
                  <span className="font-medium">{floor.name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {floor.areas.length} areas
                  </span>
                </label>
              ))}
            </div>
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
          disabled={!buildingId || selectedFloors.length === 0}
        >
          <Siren className="w-4 h-4" />
          Start Drill Now
        </Button>
      </div>
    </form>
  );
}
