import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildings } from '@/data/mockData';
import { Drill } from '@/types/safety';
import { ShieldCheck, AlertCircle, MapPin, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafetyCheckInCardProps {
  drill: Drill;
  onCheckIn: (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
  }) => void;
}

const drillTypeLabels = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency Drill',
};

export function SafetyCheckInCard({ drill, onCheckIn }: SafetyCheckInCardProps) {
  const [status, setStatus] = useState<'safe' | 'needs-assistance' | null>(null);
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');

  const building = buildings.find(b => b.id === drill.location.buildingId);
  const floors = building?.floors.filter(f => drill.location.floorIds.includes(f.id)) || [];
  const selectedFloor = floors.find(f => f.id === floorId);

  const handleSubmit = () => {
    if (status && floorId && areaId) {
      onCheckIn({ status, floorId, areaId, notes: notes || undefined });
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 gradient-emergency rounded-full mb-4 status-pulse">
          <Siren className="w-8 h-8 text-emergency-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{drillTypeLabels[drill.type]}</h1>
        <p className="text-muted-foreground mt-1">in progress at {building?.name}</p>
      </div>

      {/* Status Selection */}
      <div className="space-y-4 mb-6">
        <Label className="text-base font-semibold">Your Status</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setStatus('safe')}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
              status === 'safe'
                ? 'border-safe bg-safe-muted'
                : 'border-border hover:border-safe/50 hover:bg-safe-muted/50'
            )}
          >
            <ShieldCheck className={cn(
              'w-10 h-10',
              status === 'safe' ? 'text-safe' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'font-semibold',
              status === 'safe' ? 'text-safe' : 'text-foreground'
            )}>
              I'm Safe
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setStatus('needs-assistance')}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
              status === 'needs-assistance'
                ? 'border-warning bg-warning-muted'
                : 'border-border hover:border-warning/50 hover:bg-warning-muted/50'
            )}
          >
            <AlertCircle className={cn(
              'w-10 h-10',
              status === 'needs-assistance' ? 'text-warning' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'font-semibold',
              status === 'needs-assistance' ? 'text-warning' : 'text-foreground'
            )}>
              Need Help
            </span>
          </button>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Label className="text-base font-semibold">Your Location</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Select value={floorId} onValueChange={(v) => { setFloorId(v); setAreaId(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {floors.map(floor => (
                <SelectItem key={floor.id} value={floor.id}>
                  {floor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={areaId} onValueChange={setAreaId} disabled={!floorId}>
            <SelectTrigger>
              <SelectValue placeholder="Area" />
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

      {/* Notes (shown when needs assistance) */}
      {status === 'needs-assistance' && (
        <div className="space-y-2 mb-6 animate-fade-in">
          <Label htmlFor="notes">Additional Information</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what assistance you need..."
            rows={3}
          />
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!status || !floorId || !areaId}
        className={cn(
          'w-full h-12 text-lg font-semibold',
          status === 'safe' 
            ? 'gradient-safe text-safe-foreground hover:opacity-90' 
            : status === 'needs-assistance'
            ? 'gradient-warning text-warning-foreground hover:opacity-90'
            : ''
        )}
      >
        Submit Check-In
      </Button>
    </div>
  );
}
