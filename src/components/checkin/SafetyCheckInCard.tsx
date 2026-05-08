import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildings } from '@/data/mockData';
import { Drill } from '@/types/safety';
import { UserPermission } from '@/types/admin';
import { ShieldCheck, AlertCircle, MapPin, Siren, User, Users, Plus, Trash2, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface SafetyCheckInCardProps {
  drill: Drill;
  buildings?: Array<{
    id: string;
    name: string;
    floors: Array<{
      id: string;
      name: string;
      areas: Array<{ id: string; name: string }>;
    }>;
  }>;
  personnel?: UserPermission[];
  onCheckIn: (data: {
    status: 'safe' | 'needs-assistance';
    floorId: string;
    areaId: string;
    notes?: string;
    userType?: 'guest' | 'staff';
    staffCode?: string;
    personName?: string;
    additionalPeople?: Array<{ name: string; status: 'safe' | 'needs-assistance'; staffCode?: string; personnelId?: string }>;
  }) => void;
  isLoggedIn?: boolean;
}

const drillTypeLabels = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency Drill',
};

export function SafetyCheckInCard({ drill, buildings: customBuildings, personnel = [], onCheckIn, isLoggedIn = false }: SafetyCheckInCardProps) {
  const [status, setStatus] = useState<'safe' | 'needs-assistance' | null>(null);
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Guest/Staff selection (for non-logged-in users)
  const [userType, setUserType] = useState<'guest' | 'staff' | null>(null);
  const [staffCode, setStaffCode] = useState('');
  const [personName, setPersonName] = useState('');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  // Multi-person check-in (for logged-in users)
  const [additionalPeople, setAdditionalPeople] = useState<Array<{ name: string; status: 'safe' | 'needs-assistance'; staffCode?: string; personnelId?: string }>>([]);
  const [newPersonSearch, setNewPersonSearch] = useState('');
  const [selectedAdditionalStaffId, setSelectedAdditionalStaffId] = useState<string | null>(null);
  const [additionalPersonType, setAdditionalPersonType] = useState<'staff' | 'guest'>('staff');
  const [additionalGuestFirstName, setAdditionalGuestFirstName] = useState('');
  const [additionalGuestSurname, setAdditionalGuestSurname] = useState('');

  const availableBuildings = customBuildings ?? buildings;
  const building = availableBuildings.find(b => b.id === drill.location.buildingId);
  const floors = building?.floors.filter(f => drill.location.floorIds.includes(f.id)) || [];
  const selectedFloor = floors.find(f => f.id === floorId);

  const searchablePersonnel = personnel.filter((p) => {
    const selectedBuildingIds = drill.location.buildingIds?.length ? drill.location.buildingIds : [drill.location.buildingId];
    if (!Array.isArray(p.buildingAccess) || p.buildingAccess.length === 0) {
      return true;
    }
    return p.buildingAccess.some((buildingId) => selectedBuildingIds.includes(buildingId));
  });

  const staffSearchMatches = staffSearch.trim()
    ? searchablePersonnel.filter((p) =>
        p.userName.toLowerCase().includes(staffSearch.toLowerCase()) ||
        (p.staffCode?.toLowerCase().includes(staffSearch.toLowerCase()) ?? false),
      )
    : searchablePersonnel.slice(0, 8);

  const additionalSearchMatches = newPersonSearch.trim()
    ? searchablePersonnel.filter((p) =>
        p.userName.toLowerCase().includes(newPersonSearch.toLowerCase()) ||
        (p.staffCode?.toLowerCase().includes(newPersonSearch.toLowerCase()) ?? false),
      )
    : searchablePersonnel.slice(0, 8);

  const selectedStaff = selectedStaffId
    ? searchablePersonnel.find((person) => person.id === selectedStaffId) ?? null
    : null;

  const handleAddPerson = () => {
    if (additionalPersonType === 'guest') {
      const first = additionalGuestFirstName.trim();
      const last = additionalGuestSurname.trim();
      if (!first || !last) {
        toast.error('Enter the visitor\u2019s first name and surname');
        return;
      }
      const fullName = `${first} ${last}`;
      setAdditionalPeople(prev => [
        ...prev,
        { name: `${fullName} (Visitor)`, status: 'safe' },
      ]);
      setAdditionalGuestFirstName('');
      setAdditionalGuestSurname('');
      return;
    }

    if (!selectedAdditionalStaffId) {
      toast.error('Select a staff member to add');
      return;
    }

    const person = searchablePersonnel.find((entry) => entry.id === selectedAdditionalStaffId);
    if (!person) {
      toast.error('Selected staff member is no longer available');
      return;
    }

    if (additionalPeople.some((entry) => entry.personnelId === person.id)) {
      toast.error('This colleague is already added');
      return;
    }

    setAdditionalPeople(prev => [
      ...prev,
      {
        name: person.userName,
        status: 'safe',
        staffCode: person.staffCode,
        personnelId: person.id,
      },
    ]);
    setSelectedAdditionalStaffId(null);
    setNewPersonSearch('');
  };

  const handleRemovePerson = (index: number) => {
    setAdditionalPeople(prev => prev.filter((_, i) => i !== index));
  };

  const handlePersonStatusChange = (index: number, newStatus: 'safe' | 'needs-assistance') => {
    setAdditionalPeople(prev => prev.map((p, i) => i === index ? { ...p, status: newStatus } : p));
  };

  const handleSubmit = () => {
    // Validation for non-logged-in users
    if (!isLoggedIn) {
      if (!userType) {
        toast.error('Please select Guest or Staff');
        return;
      }
      if (userType === 'staff' && !selectedStaff) {
        toast.error('Please select a staff member');
        return;
      }
      if (userType === 'guest') {
        if (!guestFirstName.trim() || !guestSurname.trim()) {
          toast.error('Please enter your first name and surname');
          return;
        }
      } else if (!personName.trim()) {
        toast.error('Please enter your name');
        return;
      }
    }

    if (status && floorId && areaId) {
      const resolvedName = isLoggedIn
        ? undefined
        : userType === 'guest'
          ? `${guestFirstName.trim()} ${guestSurname.trim()}`.trim()
          : personName;
      onCheckIn({ 
        status, 
        floorId, 
        areaId, 
        notes: notes || undefined,
        userType: isLoggedIn ? undefined : userType!,
        staffCode: userType === 'staff' ? staffCode : undefined,
        personName: resolvedName,
        additionalPeople: additionalPeople.length > 0 ? additionalPeople : undefined,
      });
    }
  };

  const isFormValid = () => {
    const basicValid = status && floorId && areaId;
    if (isLoggedIn) {
      return basicValid;
    }
    if (!userType) return false;
    if (userType === 'guest') {
      return basicValid && guestFirstName.trim() && guestSurname.trim();
    }
    return basicValid && personName.trim() && !!selectedStaff;
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

      {/* Guest/Staff Selection (for non-logged-in users) */}
      {!isLoggedIn && (
        <div className="space-y-4 mb-6">
          <Label className="text-base font-semibold">Check-in Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setUserType('guest');
                setStaffCode('');
                setPersonName('');
                setStaffSearch('');
                setSelectedStaffId(null);
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                userType === 'guest'
                  ? 'border-info bg-info-muted'
                  : 'border-border hover:border-info/50 hover:bg-info-muted/50'
              )}
            >
              <User className={cn(
                'w-8 h-8',
                userType === 'guest' ? 'text-info' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'font-semibold text-sm',
                userType === 'guest' ? 'text-info' : 'text-foreground'
              )}>
                Guest
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setUserType('staff');
                setPersonName('');
                setStaffCode('');
                setSelectedStaffId(null);
                setGuestFirstName('');
                setGuestSurname('');
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                userType === 'staff'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <KeyRound className={cn(
                'w-8 h-8',
                userType === 'staff' ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'font-semibold text-sm',
                userType === 'staff' ? 'text-primary' : 'text-foreground'
              )}>
                Staff
              </span>
            </button>
          </div>

          {/* Staff search */}
          {userType === 'staff' && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="staff-search">Search Staff</Label>
              <div className="space-y-2">
                <Input
                  id="staff-search"
                  value={staffSearch}
                  onChange={(e) => {
                    setStaffSearch(e.target.value);
                    setSelectedStaffId(null);
                    setPersonName('');
                    setStaffCode('');
                  }}
                  placeholder="Search by name or staff code"
                />
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {staffSearchMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No staff found</p>
                  ) : (
                    staffSearchMatches.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaffId(person.id);
                          setPersonName(person.userName);
                          setStaffCode(person.staffCode ?? '');
                          setStaffSearch(person.userName);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/60',
                          selectedStaffId === person.id && 'bg-primary/10'
                        )}
                      >
                        <span className="font-medium">{person.userName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{person.staffCode || 'No staff code'}</span>
                      </button>
                    ))
                  )}
                </div>
                {selectedStaff && (
                  <p className="text-xs text-muted-foreground">
                    Staff code: <span className="font-medium">{selectedStaff.staffCode || 'Not configured'}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Name input */}
          {userType === 'staff' && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="person-name">Your Name</Label>
              <Input
                id="person-name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Selected from staff directory"
                disabled
              />
            </div>
          )}

          {userType === 'guest' && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="guest-first-name">First Name</Label>
                <Input
                  id="guest-first-name"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-surname">Surname</Label>
                <Input
                  id="guest-surname"
                  value={guestSurname}
                  onChange={(e) => setGuestSurname(e.target.value)}
                  placeholder="Surname"
                  maxLength={50}
                />
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Multi-person check-in (for logged-in users) */}
      {isLoggedIn && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Check In Another Person</Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdditionalPersonType('staff')}
              className={cn(
                'flex items-center justify-center gap-2 p-2 rounded-md border-2 text-sm transition-all',
                additionalPersonType === 'staff'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <KeyRound className="w-4 h-4" /> Staff
            </button>
            <button
              type="button"
              onClick={() => setAdditionalPersonType('guest')}
              className={cn(
                'flex items-center justify-center gap-2 p-2 rounded-md border-2 text-sm transition-all',
                additionalPersonType === 'guest'
                  ? 'border-info bg-info-muted text-info'
                  : 'border-border hover:border-info/50'
              )}
            >
              <User className="w-4 h-4" /> Guest
            </button>
          </div>

          {additionalPersonType === 'guest' ? (
            <div className="space-y-2 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={additionalGuestFirstName}
                  onChange={(e) => setAdditionalGuestFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={50}
                />
                <Input
                  value={additionalGuestSurname}
                  onChange={(e) => setAdditionalGuestSurname(e.target.value)}
                  placeholder="Surname"
                  maxLength={50}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
                />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={handleAddPerson}>
                <Plus className="w-4 h-4 mr-1" /> Add Visitor
              </Button>
            </div>
          ) : (
          <>
          <div className="flex gap-2">
            <Input
              value={newPersonSearch}
              onChange={(e) => {
                setNewPersonSearch(e.target.value);
                setSelectedAdditionalStaffId(null);
              }}
              placeholder="Search colleague by name or staff code"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()}
            />
            <Button type="button" variant="outline" onClick={handleAddPerson}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto border rounded-md">
            {additionalSearchMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No matching personnel</p>
            ) : (
              additionalSearchMatches.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setSelectedAdditionalStaffId(person.id);
                    setNewPersonSearch(person.userName);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/60',
                    selectedAdditionalStaffId === person.id && 'bg-primary/10'
                  )}
                >
                  <span className="font-medium">{person.userName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{person.staffCode || 'No staff code'}</span>
                </button>
              ))
            )}
          </div>
          </>
          )}

          {additionalPeople.length > 0 && (
            <Card className="p-3 space-y-2">
              {additionalPeople.map((person, index) => (
                <div key={index} className="flex items-center gap-2 justify-between">
                  <span className="text-sm font-medium">{person.name}</span>
                  <div className="flex items-center gap-2">
                    {person.staffCode && (
                      <Badge variant="secondary" className="text-[10px]">
                        {person.staffCode}
                      </Badge>
                    )}
                    <Select 
                      value={person.status} 
                      onValueChange={(v: 'safe' | 'needs-assistance') => handlePersonStatusChange(index, v)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe">Safe</SelectItem>
                        <SelectItem value="needs-assistance">Needs Help</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemovePerson(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <Badge variant="secondary" className="mt-2">
                {additionalPeople.length} additional {additionalPeople.length === 1 ? 'person' : 'people'}
              </Badge>
            </Card>
          )}
        </div>
      )}

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
        disabled={!isFormValid()}
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
        {additionalPeople.length > 0 && ` (${additionalPeople.length + 1} people)`}
      </Button>
    </div>
  );
}
