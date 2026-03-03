import { Drill } from '@/types/safety';
import { buildings } from '@/data/mockData';
import { Siren, Users, Clock, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useOfficeAttendance } from '@/hooks/useOfficeAttendance';

interface ActiveDrillBannerProps {
  drill: Drill;
  checkInCount: { safe: number; needsAssistance: number; pending: number };
  onEndDrill?: () => void;
}

const drillTypeLabels = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency Drill',
};

export function ActiveDrillBanner({ drill, checkInCount, onEndDrill }: ActiveDrillBannerProps) {
  const building = buildings.find(b => b.id === drill.location.buildingId);
  const { getExpectedHeadcount } = useOfficeAttendance();
  
  // Get expected people in the drill building today
  const expectedInBuilding = getExpectedHeadcount(drill.location.buildingId);
  const expectedCount = expectedInBuilding.length;
  const totalCheckedIn = checkInCount.safe + checkInCount.needsAssistance;

  return (
    <div className="relative overflow-hidden rounded-xl gradient-emergency p-6 text-emergency-foreground animate-fade-in">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
        }} />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg status-pulse">
            <Siren className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full uppercase">
                Active Drill
              </span>
            </div>
            <h3 className="text-2xl font-bold mt-1">{drillTypeLabels[drill.type]}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {building?.name}
              </span>
              {drill.startedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Started {formatDistanceToNow(drill.startedAt, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Expected in office today */}
          {expectedCount > 0 && (
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg">
              <div className="flex items-center gap-1 text-xl font-bold">
                <Building2 className="w-5 h-5" />
                {expectedCount}
              </div>
              <p className="text-xs opacity-80">Expected Today</p>
            </div>
          )}
          
          <div className="text-center">
            <div className="flex items-center gap-1 text-3xl font-bold">
              <Users className="w-6 h-6" />
              {totalCheckedIn}/{expectedCount || (checkInCount.safe + checkInCount.needsAssistance + checkInCount.pending)}
            </div>
            <p className="text-sm opacity-80">Confirmed Safe</p>
          </div>
          
          {checkInCount.needsAssistance > 0 && (
            <div className="text-center px-4 py-2 bg-white/20 rounded-lg">
              <p className="text-2xl font-bold">{checkInCount.needsAssistance}</p>
              <p className="text-sm opacity-80">Need Help</p>
            </div>
          )}

          {expectedCount > 0 && totalCheckedIn < expectedCount && (
            <Badge className="bg-white/20 text-white border-white/30">
              {expectedCount - totalCheckedIn} unaccounted
            </Badge>
          )}
          
          <Button 
            onClick={onEndDrill}
            className="bg-white text-emergency hover:bg-white/90 font-semibold"
          >
            End Drill
          </Button>
        </div>
      </div>
    </div>
  );
}
