import { useState } from 'react';
import { SafetyCheckInCard } from '@/components/checkin/SafetyCheckInCard';
import { buildings } from '@/data/mockData';
import { SafetyCheckIn as SafetyCheckInType, Drill } from '@/types/safety';
import { ShieldCheck, Siren } from 'lucide-react';
import { toast } from 'sonner';

export default function SafetyCheckIn() {
  // For demo, simulate an active drill
  const [activeDrill] = useState<Drill | null>({
    id: 'drill-active',
    type: 'fire',
    status: 'active',
    location: {
      buildingId: 'building-1',
      floorIds: ['floor-1', 'floor-2', 'floor-3'],
      areaIds: [],
    },
    startedAt: new Date(Date.now() - 5 * 60 * 1000),
    initiatedBy: 'Safety Officer',
  });

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [userCheckIn, setUserCheckIn] = useState<SafetyCheckInType | null>(null);

  const handleCheckIn = (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
  }) => {
    if (!activeDrill) return;

    const newCheckIn: SafetyCheckInType = {
      id: `checkin-${Date.now()}`,
      drillId: activeDrill.id,
      personName: 'User',
      status: data.status,
      location: {
        buildingId: activeDrill.location.buildingId,
        floorId: data.floorId,
        areaId: data.areaId,
      },
      checkedInAt: new Date(),
      notes: data.notes,
    };
    setUserCheckIn(newCheckIn);
    setHasCheckedIn(true);
    toast.success(data.status === 'safe' ? 'Marked as safe!' : 'Assistance request submitted');
  };

  const building = activeDrill ? buildings.find(b => b.id === activeDrill.location.buildingId) : null;
  const floor = userCheckIn ? building?.floors.find(f => f.id === userCheckIn.location.floorId) : null;
  const area = floor?.areas.find(a => a.id === userCheckIn?.location.areaId);

  // No active drill
  if (!activeDrill) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="p-4 bg-muted rounded-full mb-4 mx-auto w-fit">
            <ShieldCheck className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">No Active Drill</h1>
          <p className="text-muted-foreground mt-2">
            There is currently no safety drill in progress. You will be notified when a drill begins.
          </p>
        </div>
      </div>
    );
  }

  // Already checked in
  if (hasCheckedIn && userCheckIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className={`text-center py-12 px-6 rounded-xl border ${
            userCheckIn.status === 'safe' 
              ? 'bg-safe-muted border-safe/20' 
              : 'bg-warning-muted border-warning/20'
          }`}>
            <div className={`p-4 rounded-full mb-4 mx-auto w-fit ${
              userCheckIn.status === 'safe' ? 'gradient-safe' : 'gradient-warning'
            }`}>
              <ShieldCheck className={`w-12 h-12 ${
                userCheckIn.status === 'safe' ? 'text-safe-foreground' : 'text-warning-foreground'
              }`} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">You're Checked In!</h1>
            <p className="text-muted-foreground mt-2">
              {userCheckIn.status === 'safe' 
                ? 'Your status has been recorded. Stay in your current location until the all-clear is given.'
                : 'Your assistance request has been submitted. Help is on the way.'}
            </p>
            
            <div className="mt-6 p-4 bg-background/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Your reported location</p>
              <p className="font-medium text-foreground">{area?.name}, {floor?.name}</p>
              <p className="text-sm text-muted-foreground">{building?.name}</p>
            </div>

            {userCheckIn.notes && (
              <div className="mt-4 p-4 bg-background/50 rounded-lg text-left">
                <p className="text-sm text-muted-foreground">Your message</p>
                <p className="text-foreground">{userCheckIn.notes}</p>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Siren className="w-4 h-4 inline mr-1" />
            Drill in progress at {building?.name}
          </p>
        </div>
      </div>
    );
  }

  // Check-in form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        <SafetyCheckInCard drill={activeDrill} onCheckIn={handleCheckIn} />
      </div>
    </div>
  );
}
