import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SafetyCheckInCard } from '@/components/checkin/SafetyCheckInCard';
import { mockDrills, mockCheckIns, buildings } from '@/data/mockData';
import { SafetyCheckIn, Drill } from '@/types/safety';
import { ShieldCheck, AlertCircle, Clock, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const drillTypeLabels = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency Drill',
};

export default function CheckIn() {
  // For demo, simulate an active drill
  const [activeDrill] = useState<Drill>({
    id: 'drill-active',
    type: 'fire',
    status: 'active',
    location: {
      buildingId: 'building-1',
      floorIds: ['floor-1', 'floor-2', 'floor-3'],
      areaIds: [],
    },
    startedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    initiatedBy: 'Safety Officer',
  });
  
  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>(mockCheckIns);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const handleCheckIn = (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
  }) => {
    const newCheckIn: SafetyCheckIn = {
      id: `checkin-${Date.now()}`,
      drillId: activeDrill.id,
      personName: 'You',
      status: data.status,
      location: {
        buildingId: activeDrill.location.buildingId,
        floorId: data.floorId,
        areaId: data.areaId,
      },
      checkedInAt: new Date(),
      notes: data.notes,
    };
    setCheckIns([newCheckIn, ...checkIns]);
    setHasCheckedIn(true);
    toast.success(data.status === 'safe' ? 'Marked as safe!' : 'Assistance request submitted');
  };

  const stats = {
    safe: checkIns.filter(c => c.status === 'safe').length,
    needsAssistance: checkIns.filter(c => c.status === 'needs-assistance').length,
    pending: 15 - checkIns.length, // Mock total of 15 people
  };

  const getLocationName = (checkIn: SafetyCheckIn) => {
    const building = buildings.find(b => b.id === checkIn.location.buildingId);
    const floor = building?.floors.find(f => f.id === checkIn.location.floorId);
    const area = floor?.areas.find(a => a.id === checkIn.location.areaId);
    return { floor: floor?.name, area: area?.name };
  };

  if (!activeDrill) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-4 bg-muted rounded-full mb-4">
            <ShieldCheck className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Active Drill</h2>
          <p className="text-muted-foreground mt-1">There is currently no drill in progress</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Check-in Form */}
        <div className="lg:order-1">
          {hasCheckedIn ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 bg-safe-muted rounded-xl border border-safe/20">
              <div className="p-4 gradient-safe rounded-full mb-4">
                <ShieldCheck className="w-12 h-12 text-safe-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">You're Checked In!</h2>
              <p className="text-muted-foreground mt-2 text-center">
                Your status has been recorded. Stay in your current location until the all-clear is given.
              </p>
            </div>
          ) : (
            <SafetyCheckInCard drill={activeDrill} onCheckIn={handleCheckIn} />
          )}
        </div>

        {/* Status Dashboard */}
        <div className="space-y-6 lg:order-2">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-safe-muted border border-safe/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-safe">
                <ShieldCheck className="w-6 h-6" />
                {stats.safe}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Safe</p>
            </div>
            <div className="bg-warning-muted border border-warning/20 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-warning">
                <AlertCircle className="w-6 h-6" />
                {stats.needsAssistance}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Need Help</p>
            </div>
            <div className="bg-muted border border-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-muted-foreground">
                <Clock className="w-6 h-6" />
                {stats.pending}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pending</p>
            </div>
          </div>

          {/* Recent Check-ins */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Check-ins</h3>
              <span className="text-sm text-muted-foreground">
                <Users className="w-4 h-4 inline mr-1" />
                {checkIns.length} checked in
              </span>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {checkIns.map((checkIn) => {
                const location = getLocationName(checkIn);
                return (
                  <div key={checkIn.id} className="px-6 py-3 flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      checkIn.status === 'safe' ? 'bg-safe-muted' : 'bg-warning-muted'
                    )}>
                      {checkIn.status === 'safe' 
                        ? <ShieldCheck className="w-4 h-4 text-safe" />
                        : <AlertCircle className="w-4 h-4 text-warning" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{checkIn.personName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {location.area}, {location.floor}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {checkIn.checkedInAt && formatDistanceToNow(checkIn.checkedInAt, { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
