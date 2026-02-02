import { useState, useMemo } from 'react';
import { Users, Building2, Layers, MapPin, Calendar, Activity, Edit2, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPermission, CustomBuilding, WorkDay, WORK_DAY_LABELS, ALL_WORK_DAYS, SafetyRole, SAFETY_ROLE_LABELS, SAFETY_ROLE_COLORS, ALL_SAFETY_ROLES, ROLE_LABELS, UserRole } from '@/types/admin';
import { mockDrills, mockCheckIns } from '@/data/mockData';
import { toast } from 'sonner';

interface PersonnelDialogProps {
  personnel: UserPermission[];
  buildings: CustomBuilding[];
  onUpdate: (id: string, updates: Partial<UserPermission>) => void;
  trigger: React.ReactNode;
}

type SortField = 'name' | 'building' | 'floor' | 'participation';
type SortDirection = 'asc' | 'desc';

export function PersonnelDialog({ personnel, buildings, onUpdate, trigger }: PersonnelDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');

  // Helper to get building/floor/area names
  const getLocationInfo = (person: UserPermission) => {
    let buildingName = '-';
    let floorName = '-';
    let areaName = '-';

    if (person.primaryFloorId) {
      for (const building of buildings) {
        const floor = building.floors.find(f => f.id === person.primaryFloorId);
        if (floor) {
          buildingName = building.name;
          floorName = floor.name;
          // Get first area of the floor as default (can be enhanced with area assignment later)
          if (floor.areas.length > 0) {
            areaName = floor.areas[0].name;
          }
          break;
        }
      }
    } else if (person.buildingAccess.length > 0) {
      const building = buildings.find(b => b.id === person.buildingAccess[0]);
      if (building) {
        buildingName = building.name;
      }
    }

    return { buildingName, floorName, areaName };
  };

  // Calculate drill participation rate for each person
  const getDrillParticipation = (person: UserPermission) => {
    // Get completed drills
    const completedDrills = mockDrills.filter(d => d.status === 'completed');
    if (completedDrills.length === 0) return { rate: 0, participated: 0, total: 0 };

    // Check how many drills the person participated in
    const participatedDrills = completedDrills.filter(drill => {
      return mockCheckIns.some(
        checkIn => checkIn.drillId === drill.id && 
        checkIn.personName.toLowerCase().includes(person.userName.toLowerCase().split(' ')[0])
      );
    });

    const rate = Math.round((participatedDrills.length / completedDrills.length) * 100);
    return { rate, participated: participatedDrills.length, total: completedDrills.length };
  };

  // Enhanced personnel data with computed fields
  const enhancedPersonnel = useMemo(() => {
    return personnel.map(person => {
      const location = getLocationInfo(person);
      const participation = getDrillParticipation(person);
      // Split name into first name and surname
      const nameParts = person.userName.split(' ');
      const firstName = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || '';
      
      return {
        ...person,
        firstName,
        surname,
        ...location,
        participation,
      };
    });
  }, [personnel, buildings]);

  // Filter and sort personnel
  const filteredPersonnel = useMemo(() => {
    let result = enhancedPersonnel;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.userName.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.buildingName.toLowerCase().includes(query) ||
        p.floorName.toLowerCase().includes(query)
      );
    }

    // Apply building filter
    if (filterBuilding !== 'all') {
      result = result.filter(p => p.buildingAccess.includes(filterBuilding));
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'building':
          comparison = a.buildingName.localeCompare(b.buildingName);
          break;
        case 'floor':
          comparison = a.floorName.localeCompare(b.floorName);
          break;
        case 'participation':
          comparison = a.participation.rate - b.participation.rate;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enhancedPersonnel, searchQuery, filterBuilding, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const getParticipationColor = (rate: number) => {
    if (rate >= 80) return 'bg-safe text-safe-foreground';
    if (rate >= 50) return 'bg-warning text-warning-foreground';
    return 'bg-emergency text-emergency-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Personnel Directory ({personnel.length} total)
          </DialogTitle>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger className="w-full sm:w-48">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Personnel Table */}
        <ScrollArea className="flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Name <SortIcon field="name" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 hidden md:table-cell"
                  onClick={() => handleSort('building')}
                >
                  Building <SortIcon field="building" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell"
                  onClick={() => handleSort('floor')}
                >
                  Floor <SortIcon field="floor" />
                </TableHead>
                <TableHead className="hidden xl:table-cell">Area</TableHead>
                <TableHead className="hidden sm:table-cell">Work Days</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('participation')}
                >
                  Drill Participation <SortIcon field="participation" />
                </TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || filterBuilding !== 'all' 
                      ? 'No personnel match your filters'
                      : 'No personnel configured yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map(person => (
                  <PersonnelRow
                    key={person.id}
                    person={person}
                    buildings={buildings}
                    isEditing={editingPersonId === person.id}
                    onEdit={() => setEditingPersonId(person.id)}
                    onSave={(updates) => {
                      onUpdate(person.id, updates);
                      setEditingPersonId(null);
                      toast.success('Personnel updated successfully');
                    }}
                    onCancel={() => setEditingPersonId(null)}
                    getParticipationColor={getParticipationColor}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-safe" /> 80%+ participation
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-warning" /> 50-79%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emergency" /> &lt;50%
            </span>
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PersonnelRowProps {
  person: UserPermission & {
    firstName: string;
    surname: string;
    buildingName: string;
    floorName: string;
    areaName: string;
    participation: { rate: number; participated: number; total: number };
  };
  buildings: CustomBuilding[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<UserPermission>) => void;
  onCancel: () => void;
  getParticipationColor: (rate: number) => string;
}

function PersonnelRow({ person, buildings, isEditing, onEdit, onSave, onCancel, getParticipationColor }: PersonnelRowProps) {
  const [editData, setEditData] = useState({
    userName: person.userName,
    primaryFloorId: person.primaryFloorId || '',
    workDays: person.workDays || [],
    buildingAccess: person.buildingAccess || [],
  });

  const allFloors = buildings.flatMap(building => 
    building.floors.map(floor => ({
      id: floor.id,
      name: floor.name,
      buildingId: building.id,
      buildingName: building.name,
    }))
  );

  const toggleWorkDay = (day: WorkDay) => {
    setEditData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day],
    }));
  };

  if (isEditing) {
    return (
      <TableRow className="bg-muted/30">
        <TableCell colSpan={7}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editData.userName}
                  onChange={(e) => setEditData(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="First Last"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Floor</Label>
                <Select 
                  value={editData.primaryFloorId || 'none'} 
                  onValueChange={(value) => setEditData(prev => ({ ...prev, primaryFloorId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No primary floor</SelectItem>
                    {allFloors.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.buildingName} - {floor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Building Access</Label>
                <Select 
                  value={editData.buildingAccess[0] || 'none'} 
                  onValueChange={(value) => setEditData(prev => ({ 
                    ...prev, 
                    buildingAccess: value === 'none' ? [] : [value] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No building</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Work Days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_WORK_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      editData.workDays.includes(day)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {WORK_DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => onSave(editData)}>
                Save Changes
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{person.firstName} {person.surname}</p>
          <p className="text-sm text-muted-foreground">{person.email}</p>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          {person.buildingName}
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-muted-foreground" />
          {person.floorName}
        </div>
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          {person.areaName}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex flex-wrap gap-1">
          {person.workDays && person.workDays.length > 0 ? (
            person.workDays.map(day => (
              <Badge key={day} variant="outline" className="text-xs">
                {WORK_DAY_LABELS[day]}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">Not set</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge className={getParticipationColor(person.participation.rate)}>
            {person.participation.rate}%
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({person.participation.participated}/{person.participation.total} drills)
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
