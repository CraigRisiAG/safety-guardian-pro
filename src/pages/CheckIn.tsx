import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SafetyCheckInCard } from '@/components/checkin/SafetyCheckInCard';
import { FloorCheckInProgress } from '@/components/checkin/FloorCheckInProgress';
import { SafetyCheckIn } from '@/types/safety';
import { ShieldCheck, AlertCircle, Clock, Users, MapPin, Percent, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import {
  addCheckInsToStorage,
  getCheckInsStorageSnapshot,
  loadCheckInsForDrill,
} from '@/lib/checkInsStorage';
import { canStartDrillsForUser, filterPersonnelByUserScope, findCurrentUserPermission } from '@/lib/personnelAccess';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const drillTypeLabels = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency Drill',
};

export default function CheckIn() {
  const { activeDrill } = useDrillStatus();
  const { settings } = useAdminSettings();
  const { user } = useAuth();

  const [checkIns, setCheckIns] = useState<SafetyCheckIn[]>([]);
  const [storageSnapshot, setStorageSnapshot] = useState<string | null>(getCheckInsStorageSnapshot());
  const [isColleagueFormVisible, setIsColleagueFormVisible] = useState(false);
  const [colleagueSearch, setColleagueSearch] = useState('');
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>('');
  const [colleagueStatus, setColleagueStatus] = useState<'safe' | 'needs-assistance'>('safe');
  const [colleagueFloorId, setColleagueFloorId] = useState('');
  const [colleagueAreaId, setColleagueAreaId] = useState('');
  const [colleagueNotes, setColleagueNotes] = useState('');
  const [colleaguePersonType, setColleaguePersonType] = useState<'staff' | 'guest'>('staff');
  const [colleagueGuestFirstName, setColleagueGuestFirstName] = useState('');
  const [colleagueGuestSurname, setColleagueGuestSurname] = useState('');

  useEffect(() => {
    if (!activeDrill) {
      setCheckIns([]);
      return;
    }
    setCheckIns(loadCheckInsForDrill(activeDrill.id));
  }, [activeDrill]);

  useEffect(() => {
    const syncCheckIns = () => {
      const snapshot = getCheckInsStorageSnapshot();
      if (snapshot !== storageSnapshot) {
        setStorageSnapshot(snapshot);
        if (activeDrill) {
          setCheckIns(loadCheckInsForDrill(activeDrill.id));
        }
      }
    };

    window.addEventListener('storage', syncCheckIns);
    const intervalId = setInterval(syncCheckIns, 1500);

    return () => {
      window.removeEventListener('storage', syncCheckIns);
      clearInterval(intervalId);
    };
  }, [activeDrill, storageSnapshot]);

  const building = useMemo(
    () => activeDrill ? settings.buildings.find((entry) => entry.id === activeDrill.location.buildingId) ?? null : null,
    [activeDrill, settings.buildings],
  );

  const drillFloors = useMemo(
    () => building?.floors.filter((floor) => activeDrill?.location.floorIds.includes(floor.id)) ?? [],
    [building, activeDrill],
  );

  const floorHeadcounts = useMemo(
    () => drillFloors.map((floor) => ({
      floorId: floor.id,
      expectedHeadcount: floor.areas.reduce((sum, area) => sum + (area.expectedHeadcount ?? 0), 0),
    })),
    [drillFloors],
  );

  const stats = useMemo(() => {
    const relevant = activeDrill ? checkIns.filter((checkIn) => checkIn.drillId === activeDrill.id) : [];
    const safe = relevant.filter((checkIn) => checkIn.status === 'safe').length;
    const needsAssistance = relevant.filter((checkIn) => checkIn.status === 'needs-assistance').length;
    const checkedIn = safe + needsAssistance;
    const totalExpected = floorHeadcounts.reduce((sum, floor) => sum + floor.expectedHeadcount, 0);
    const pending = totalExpected > 0 ? Math.max(0, totalExpected - checkedIn) : 0;
    const percentage = totalExpected > 0 ? Math.round((checkedIn / totalExpected) * 100) : 100;

    return {
      safe,
      needsAssistance,
      checkedIn,
      totalExpected,
      pending,
      percentage,
    };
  }, [activeDrill, checkIns, floorHeadcounts]);

  const userSelfCheckIn = useMemo(() => {
    if (!user || !activeDrill) {
      return null;
    }

    return checkIns.find(
      (entry) =>
        entry.drillId === activeDrill.id &&
        entry.isSelfCheckIn &&
        entry.checkedInByUserId === user.id,
    ) ?? null;
  }, [user, activeDrill, checkIns]);

  const hasCheckedIn = !!userSelfCheckIn;

  const eligiblePersonnel = useMemo(() => {
    if (!activeDrill) {
      return [];
    }

    const scopedPersonnel = filterPersonnelByUserScope(settings.userPermissions, user);

    const selectedBuildingIds = activeDrill.location.buildingIds?.length
      ? activeDrill.location.buildingIds
      : [activeDrill.location.buildingId];

    return scopedPersonnel.filter((person) =>
      person.buildingAccess.some((buildingId) => selectedBuildingIds.includes(buildingId)),
    );
  }, [activeDrill, settings.userPermissions, user]);

  const colleagueOptions = useMemo(() => {
    const query = colleagueSearch.trim().toLowerCase();
    const checkedInPersonnelIds = new Set(
      checkIns
        .filter((entry) => entry.drillId === activeDrill?.id)
        .map((entry) => entry.personnelId)
        .filter(Boolean),
    );

    return eligiblePersonnel
      .filter((person) => !checkedInPersonnelIds.has(person.id))
      .filter((person) =>
        query.length === 0 ||
        person.userName.toLowerCase().includes(query) ||
        (person.staffCode?.toLowerCase().includes(query) ?? false),
      )
      .slice(0, 10);
  }, [eligiblePersonnel, checkIns, activeDrill, colleagueSearch]);

  const selectedColleague = useMemo(
    () => eligiblePersonnel.find((person) => person.id === selectedColleagueId) ?? null,
    [eligiblePersonnel, selectedColleagueId],
  );

  const selectedColleagueFloor = drillFloors.find((floor) => floor.id === colleagueFloorId);

  const getLocationName = (checkIn: SafetyCheckIn) => {
    const locationFloor = building?.floors.find((entry) => entry.id === checkIn.location.floorId);
    const locationArea = locationFloor?.areas.find((entry) => entry.id === checkIn.location.areaId);

    return {
      floor: locationFloor?.name,
      area: locationArea?.name,
    };
  };

  const persistEntries = (entries: SafetyCheckIn[]) => {
    addCheckInsToStorage(entries);
    setCheckIns((previous) => [...entries, ...previous]);
    setStorageSnapshot(getCheckInsStorageSnapshot());
  };

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
    if (!activeDrill || !user) return;

    const now = Date.now();
    const baseLocation = {
      buildingId: activeDrill.location.buildingId,
      floorId: data.floorId,
      areaId: data.areaId,
    };

    const primaryCheckIn: SafetyCheckIn = {
      id: `checkin-${now}`,
      drillId: activeDrill.id,
      personName: user.name,
      staffCode: data.staffCode,
      personnelId: user.id,
      isSelfCheckIn: true,
      checkedInByUserId: user.id,
      checkedInByName: user.name,
      status: data.status,
      location: baseLocation,
      checkedInAt: new Date(),
      notes: data.notes,
    };

    const colleagueEntries: SafetyCheckIn[] = (data.additionalPeople ?? []).map((person, index) => ({
      id: `checkin-${now}-${index + 1}`,
      drillId: activeDrill.id,
      personName: person.name,
      staffCode: person.staffCode,
      personnelId: person.personnelId,
      isSelfCheckIn: false,
      checkedInByUserId: user.id,
      checkedInByName: user.name,
      status: person.status,
      location: baseLocation,
      checkedInAt: new Date(),
    }));

    persistEntries([primaryCheckIn, ...colleagueEntries]);

    const totalPeople = 1 + colleagueEntries.length;
    toast.success(totalPeople > 1 ? `${totalPeople} people checked in` : 'Check-in saved');
  };

  const handleCheckInColleague = () => {
    if (!activeDrill || !user || !colleagueFloorId || !colleagueAreaId) {
      toast.error('Select floor and section');
      return;
    }

    let personName: string;
    let staffCode: string | undefined;
    let personnelId: string | undefined;

    if (colleaguePersonType === 'guest') {
      const first = colleagueGuestFirstName.trim();
      const last = colleagueGuestSurname.trim();
      if (!first || !last) {
        toast.error('Enter the guest\u2019s first name and surname');
        return;
      }
      personName = `${first} ${last} (Guest)`;
    } else {
      if (!selectedColleague) {
        toast.error('Select a staff member');
        return;
      }
      personName = selectedColleague.userName;
      staffCode = selectedColleague.staffCode;
      personnelId = selectedColleague.id;
    }

    const entry: SafetyCheckIn = {
      id: `checkin-${Date.now()}`,
      drillId: activeDrill.id,
      personName,
      staffCode,
      personnelId,
      isSelfCheckIn: false,
      checkedInByUserId: user.id,
      checkedInByName: user.name,
      status: colleagueStatus,
      location: {
        buildingId: activeDrill.location.buildingId,
        floorId: colleagueFloorId,
        areaId: colleagueAreaId,
      },
      checkedInAt: new Date(),
      notes: colleagueNotes || undefined,
    };

    persistEntries([entry]);
    setSelectedColleagueId('');
    setColleagueSearch('');
    setColleagueStatus('safe');
    setColleagueFloorId('');
    setColleagueAreaId('');
    setColleagueNotes('');
    setColleagueGuestFirstName('');
    setColleagueGuestSurname('');
    setIsColleagueFormVisible(false);
    toast.success(`Checked in ${personName}`);
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
        <div className="lg:order-1 space-y-4">
          {hasCheckedIn ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8 px-6 bg-safe-muted rounded-xl border border-safe/20">
                <div className="p-4 gradient-safe rounded-full mb-4">
                  <ShieldCheck className="w-12 h-12 text-safe-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">You're Checked In!</h2>
                <p className="text-muted-foreground mt-2 text-center">
                  Your status is saved. You can now check in another person below.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsColleagueFormVisible((previous) => !previous)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isColleagueFormVisible ? 'Hide Form' : 'Check In Another Person'}
                </Button>
              </div>

              {isColleagueFormVisible && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Check In Another Person</h3>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setColleaguePersonType('staff')}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2 rounded-md border-2 text-sm transition-all',
                        colleaguePersonType === 'staff'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setColleaguePersonType('guest')}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2 rounded-md border-2 text-sm transition-all',
                        colleaguePersonType === 'guest'
                          ? 'border-info bg-info-muted text-info'
                          : 'border-border hover:border-info/50'
                      )}
                    >
                      Guest
                    </button>
                  </div>

                  {colleaguePersonType === 'guest' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="guest-first">First Name</Label>
                        <Input
                          id="guest-first"
                          value={colleagueGuestFirstName}
                          onChange={(event) => setColleagueGuestFirstName(event.target.value)}
                          placeholder="First name"
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="guest-surname">Surname</Label>
                        <Input
                          id="guest-surname"
                          value={colleagueGuestSurname}
                          onChange={(event) => setColleagueGuestSurname(event.target.value)}
                          placeholder="Surname"
                          maxLength={50}
                        />
                      </div>
                    </div>
                  ) : (
                  <div className="space-y-2">
                    <Label htmlFor="colleague-search">Search Staff</Label>
                    <Input
                      id="colleague-search"
                      value={colleagueSearch}
                      onChange={(event) => {
                        setColleagueSearch(event.target.value);
                        setSelectedColleagueId('');
                      }}
                      placeholder="Search by name or staff code"
                    />
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {colleagueOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No matching staff found</p>
                      ) : (
                        colleagueOptions.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/60',
                              selectedColleagueId === person.id && 'bg-primary/10'
                            )}
                            onClick={() => {
                              setSelectedColleagueId(person.id);
                              setColleagueSearch(person.userName);
                            }}
                          >
                            <span className="font-medium">{person.userName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{person.staffCode || 'No staff code'}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {selectedColleague && (
                      <p className="text-xs text-muted-foreground">
                        Staff code: <span className="font-medium">{selectedColleague.staffCode || 'Not configured'}</span>
                      </p>
                    )}
                  </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Select value={colleagueFloorId} onValueChange={(value) => { setColleagueFloorId(value); setColleagueAreaId(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {drillFloors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>{floor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={colleagueAreaId} onValueChange={setColleagueAreaId} disabled={!colleagueFloorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Section" />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedColleagueFloor?.areas ?? []).map((area) => (
                          <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={colleagueStatus} onValueChange={(value: 'safe' | 'needs-assistance') => setColleagueStatus(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe">Safe</SelectItem>
                      <SelectItem value="needs-assistance">Needs Assistance</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={colleagueNotes}
                    onChange={(event) => setColleagueNotes(event.target.value)}
                    placeholder="Optional notes"
                  />

                  <Button onClick={handleCheckInColleague} className="w-full">
                    Save Check-In
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <SafetyCheckInCard
              drill={activeDrill}
              buildings={settings.buildings}
              personnel={eligiblePersonnel}
              onCheckIn={handleCheckIn}
              isLoggedIn
            />
          )}
        </div>

        <div className="space-y-6 lg:order-2">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary">
              <Percent className="w-7 h-7" />
              {stats.percentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.checkedIn} of {stats.totalExpected || stats.checkedIn} accounted for
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-safe-muted border border-safe/20 rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-xl sm:text-2xl font-bold text-safe">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                {stats.safe}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Safe</p>
            </div>
            <div className="bg-warning-muted border border-warning/20 rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-xl sm:text-2xl font-bold text-warning">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                {stats.needsAssistance}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Need Help</p>
            </div>
            <div className="bg-muted border border-border rounded-xl p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-xl sm:text-2xl font-bold text-muted-foreground">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                {stats.pending}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Pending</p>
            </div>
          </div>

          {building && (
            <FloorCheckInProgress
              building={{
                id: building.id,
                name: building.name,
                floors: building.floors.map((floor) => ({
                  id: floor.id,
                  name: floor.name,
                  areas: floor.areas.map((area) => ({
                    id: area.id,
                    name: area.name,
                    floorId: floor.id,
                  })),
                })),
              }}
              drillFloorIds={activeDrill.location.floorIds}
              checkIns={checkIns.filter((entry) => entry.drillId === activeDrill.id)}
              floorHeadcounts={floorHeadcounts}
            />
          )}

          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Check-ins</h3>
              <span className="text-sm text-muted-foreground">
                <Users className="w-4 h-4 inline mr-1" />
                {checkIns.length} checked in
              </span>
            </div>
            <div className="px-6 py-2 border-b border-border bg-muted/30">
              <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="col-span-4">Person</span>
                <span className="col-span-3">Location</span>
                <span className="col-span-3">Checked In By</span>
                <span className="col-span-2 text-right">Checked In</span>
              </div>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {checkIns.map((checkIn) => {
                const location = getLocationName(checkIn);
                return (
                  <div key={checkIn.id} className="px-6 py-3 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4 min-w-0 flex items-center gap-2">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                        checkIn.status === 'safe' ? 'bg-safe-muted' : 'bg-warning-muted'
                      )}>
                        {checkIn.status === 'safe'
                          ? <ShieldCheck className="w-4 h-4 text-safe" />
                          : <AlertCircle className="w-4 h-4 text-warning" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{checkIn.personName}</p>
                        <p className="text-xs text-muted-foreground truncate">{checkIn.staffCode || 'No staff code'}</p>
                      </div>
                    </div>

                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {location.area || 'Unknown area'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{location.floor || 'Unknown floor'}</p>
                    </div>

                    <div className="col-span-3 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {checkIn.checkedInByName || checkIn.personName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {checkIn.isSelfCheckIn ? 'Self check-in' : 'Colleague check-in'}
                      </p>
                    </div>

                    <div className="col-span-2 text-right text-xs text-muted-foreground">
                      {checkIn.checkedInAt ? formatDistanceToNow(checkIn.checkedInAt, { addSuffix: true }) : '-'}
                    </div>
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
