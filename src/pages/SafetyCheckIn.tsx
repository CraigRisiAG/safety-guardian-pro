import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SafetyCheckInCard } from '@/components/checkin/SafetyCheckInCard';
import { buildings } from '@/data/mockData';
import { SafetyCheckIn as SafetyCheckInType, Drill } from '@/types/safety';
import { ShieldCheck, Siren, CheckCircle2, Bell, Users, User, KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

// Simulated drill state - in production this would come from a backend
const DRILL_DURATION_MS = 120000; // 2 minutes for demo

export default function SafetyCheckIn() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [drillStartTime] = useState(() => Date.now() - 5 * 60 * 1000);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };
  const [drillEndTime, setDrillEndTime] = useState<number | null>(null);
  const [isAllClear, setIsAllClear] = useState(false);
  const [showAllClearNotification, setShowAllClearNotification] = useState(false);
  
  // For demo, simulate an active drill that will end
  const [activeDrill, setActiveDrill] = useState<Drill | null>({
    id: 'drill-active',
    type: 'fire',
    status: 'active',
    location: {
      buildingId: 'building-1',
      floorIds: ['floor-1', 'floor-2', 'floor-3'],
      areaIds: [],
    },
    startedAt: new Date(drillStartTime),
    initiatedBy: 'Safety Officer',
  });

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [userCheckIn, setUserCheckIn] = useState<SafetyCheckInType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Simulate real-time drill status polling
  useEffect(() => {
    if (isAllClear) return;

    // Check localStorage for drill end signal (simulates real-time)
    const checkDrillStatus = () => {
      const storedEndTime = localStorage.getItem('drill_end_time');
      if (storedEndTime) {
        const endTime = parseInt(storedEndTime, 10);
        if (Date.now() >= endTime) {
          handleDrillEnd();
        } else {
          setTimeRemaining(Math.max(0, endTime - Date.now()));
        }
      }
    };

    // Poll every second for status updates
    const interval = setInterval(checkDrillStatus, 1000);
    checkDrillStatus();

    // For demo: auto-end drill after duration
    const demoTimer = setTimeout(() => {
      localStorage.setItem('drill_end_time', String(Date.now()));
    }, DRILL_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(demoTimer);
    };
  }, [isAllClear]);

  const handleDrillEnd = useCallback(() => {
    setIsAllClear(true);
    setDrillEndTime(Date.now());
    setActiveDrill(prev => prev ? { ...prev, status: 'completed', completedAt: new Date() } : null);
    setShowAllClearNotification(true);
    
    // Show toast notification
    toast.success('All Clear! The drill has ended.', {
      duration: 10000,
      icon: <CheckCircle2 className="w-5 h-5 text-safe" />,
    });

    // Clear localStorage
    localStorage.removeItem('drill_end_time');
  }, []);

  // For demo: Allow manually triggering end drill
  const triggerEndDrill = () => {
    localStorage.setItem('drill_end_time', String(Date.now()));
  };

  const [checkInDetails, setCheckInDetails] = useState<{
    userType?: 'guest' | 'staff';
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance' }>;
  }>({});

  const handleCheckIn = (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
    userType?: 'guest' | 'staff';
    staffCode?: string;
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance' }>;
  }) => {
    if (!activeDrill) return;

    const displayName = isAuthenticated && user ? user.name : data.personName || 'Guest';

    const newCheckIn: SafetyCheckInType = {
      id: `checkin-${Date.now()}`,
      drillId: activeDrill.id,
      personName: displayName,
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

          {/* All Clear Notification Overlay */}
          {showAllClearNotification && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-card border border-safe/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
                <div className="p-4 gradient-safe rounded-full mb-4 mx-auto w-fit">
                  <CheckCircle2 className="w-12 h-12 text-safe-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">All Clear!</h2>
                <p className="text-muted-foreground mb-6">
                  The safety drill has ended. Thank you for participating. You may now return to your normal activities.
                </p>
                <Button 
                  onClick={() => setShowAllClearNotification(false)}
                  className="gradient-safe text-safe-foreground w-full"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className={`text-center text-sm mt-6 p-3 rounded-lg ${
            isAllClear 
              ? 'bg-safe-muted text-safe' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {isAllClear ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Drill completed - All Clear
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Siren className="w-4 h-4 animate-pulse" />
                Drill in progress at {building?.name}
                {timeRemaining !== null && (
                  <span className="ml-2 font-mono">
                    ({Math.ceil(timeRemaining / 1000)}s remaining)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Demo: End drill button */}
          {!isAllClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerEndDrill}
              className="mt-4 w-full text-xs"
            >
              <Bell className="w-3 h-3 mr-1" />
              Demo: Trigger All-Clear
            </Button>
          )}
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
        <SafetyCheckInCard drill={activeDrill} onCheckIn={handleCheckIn} isLoggedIn={isAuthenticated} />
      </div>
    </div>
  );
}
