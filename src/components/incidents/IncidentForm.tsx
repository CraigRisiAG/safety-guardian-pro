import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomBuilding } from '@/types/admin';
import { IncidentSeverity } from '@/types/safety';
import { AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface IncidentFormProps {
  buildings: CustomBuilding[];
  onSubmit: (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    buildingId: string;
    floorId: string;
    areaId: string;
  }) => void;
  onCancel?: () => void;
}

export function IncidentForm({ buildings, onSubmit, onCancel }: IncidentFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('low');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');

  const selectedBuilding = buildings.find(b => b.id === buildingId);
  const selectedFloor = selectedBuilding?.floors.find(f => f.id === floorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!buildingId || !floorId || !areaId) {
      toast.error('Please select building, floor, and area');
      return;
    }

    onSubmit({ title, description, severity, buildingId, floorId, areaId });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="p-2 bg-warning-muted rounded-lg">
          <AlertTriangle className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Report New Incident</h3>
          <p className="text-sm text-muted-foreground">Fill in the details below</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Incident Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the incident"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide detailed information about the incident..."
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Severity Level</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  Low - Minor issue, no immediate risk
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  Medium - Requires attention soon
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emergency" />
                  High - Significant risk, urgent action needed
                </span>
              </SelectItem>
              <SelectItem value="critical">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emergency animate-pulse" />
                  Critical - Immediate danger
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Building</Label>
            <Select value={buildingId} onValueChange={(v) => { setBuildingId(v); setFloorId(''); setAreaId(''); }}>
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

          <div className="space-y-2">
            <Label>Floor</Label>
            <Select value={floorId} onValueChange={(v) => { setFloorId(v); setAreaId(''); }} disabled={!buildingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {selectedBuilding?.floors.map(floor => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Area</Label>
            <Select value={areaId} onValueChange={setAreaId} disabled={!floorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {selectedFloor?.areas.map(area => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1 gap-2">
          <Send className="w-4 h-4" />
          Submit Report
        </Button>
      </div>
    </form>
  );
}
