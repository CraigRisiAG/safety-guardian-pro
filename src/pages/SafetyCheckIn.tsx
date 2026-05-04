import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SafetyCheckInCard } from '@/components/checkin/SafetyCheckInCard';
import { buildings } from '@/data/mockData';
import { SafetyCheckIn as SafetyCheckInType, Drill } from '@/types/safety';
import { ShieldCheck, Siren, Users, User, KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useDrillStatus } from '@/hooks/useDrillStatus';

export default function SafetyCheckIn() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { settings } = useAdminSettings();
  const { activeDrill } = useDrillStatus();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [userCheckIn, setUserCheckIn] = useState<SafetyCheckInType | null>(null);

  const [checkInDetails, setCheckInDetails] = useState<{
    userType?: 'guest' | 'staff';
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance' }>;
  }>({});

  const currentDrill = activeDrill;

  const handleCheckIn = (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
    userType?: 'guest' | 'staff';
    staffCode?: string;
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance'; staffCode?: string; personnelId?: string }>;
  }) => {
    if (!currentDrill) return;

    const displayName = isAuthenticated && user ? user.name : data.personName || 'Guest';

    const newCheckIn: SafetyCheckInType = {
      id: `checkin-${Date.now()}`,
      drillId: currentDrill.id,
      personName: displayName,
      staffCode: data.staffCode,
      status: data.status,
      location: {
        buildingId: currentDrill.location.buildingId,
        floorId: data.floorId,
        areaId: data.areaId,
      },
      checkedInAt: new Date(),
      notes: data.notes,
    };
    setUserCheckIn(newCheckIn);
    setCheckInDetails({
      userType: data.userType,
      personName: data.personName,
      additionalPeople: data.additionalPeople,
    });
    setHasCheckedIn(true);
    
    const additionalCount = data.additionalPeople?.length || 0;
    const message = additionalCount > 0 
      ? `${additionalCount + 1} people checked in successfully!`
      : data.status === 'safe' ? 'Marked as safe!' : 'Assistance request submitted';
    toast.success(message);
  };

  const availableBuildings = settings.buildings.length > 0 ? settings.buildings : buildings;
  const building = currentDrill ? availableBuildings.find(b => b.id === currentDrill.location.buildingId) : null;
  const floor = userCheckIn ? building?.floors.find(f => f.id === userCheckIn.location.floorId) : null;
  const area = floor?.areas.find(a => a.id === userCheckIn?.location.areaId);

  // No active drill
  if (!currentDrill) {
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
              <div className="flex items-center justify-center gap-2 mb-2">
                {checkInDetails.userType === 'guest' && <User className="w-4 h-4 text-info" />}
                {checkInDetails.userType === 'staff' && <KeyRound className="w-4 h-4 text-primary" />}
                {isAuthenticated && <Users className="w-4 h-4 text-safe" />}
                <span className="text-sm font-medium">
                  {isAuthenticated ? user?.name : checkInDetails.personName}
                </span>
                {checkInDetails.userType && (
                  <Badge variant="secondary" className="text-xs">
                    {checkInDetails.userType === 'guest' ? 'Guest' : 'Staff'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Your reported location</p>
              <p className="font-medium text-foreground">{area?.name}, {floor?.name}</p>
              <p className="text-sm text-muted-foreground">{building?.name}</p>
            </div>

            {/* Show additional people checked in */}
            {checkInDetails.additionalPeople && checkInDetails.additionalPeople.length > 0 && (
              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Additional people checked in
                </p>
                <div className="space-y-1">
                  {checkInDetails.additionalPeople.map((person, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{person.name}</span>
                      <Badge variant={person.status === 'safe' ? 'default' : 'destructive'} className="text-xs">
                        {person.status === 'safe' ? 'Safe' : 'Needs Help'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userCheckIn.notes && (
              <div className="mt-4 p-4 bg-background/50 rounded-lg text-left">
                <p className="text-sm text-muted-foreground">Your message</p>
                <p className="text-foreground">{userCheckIn.notes}</p>
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="text-center text-sm mt-6 p-3 rounded-lg bg-muted text-muted-foreground">
            <span className="flex items-center justify-center gap-2">
              <Siren className="w-4 h-4 animate-pulse" />
              Drill in progress at {building?.name}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Check-in form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {isAuthenticated && (
          <div className="mb-4 p-3 bg-safe-muted rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm text-safe flex items-center gap-2">
                <Users className="w-4 h-4" />
                Logged in as <span className="font-semibold">{user?.name}</span>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive h-8"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">You can check in multiple people</p>
          </div>
        )}
        <SafetyCheckInCard
          drill={currentDrill}
          buildings={settings.buildings}
          personnel={settings.userPermissions}
          onCheckIn={handleCheckIn}
          isLoggedIn={isAuthenticated}
        />
      </div>
    </div>
  );
}
