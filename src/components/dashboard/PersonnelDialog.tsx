import { useState, useMemo, useRef } from 'react';
import { Users, Building2, Layers, MapPin, Edit2, Search, X, ChevronUp, ChevronDown, Upload, Download, FileSpreadsheet, AlertCircle, Plus, UserPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPermission, CustomBuilding, WorkDay, WORK_DAY_LABELS, ALL_WORK_DAYS, SafetyRole, UserRole, STAFF_CODE_MAX_LENGTH } from '@/types/admin';
import { mockDrills, mockCheckIns } from '@/data/mockData';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface PersonnelDialogProps {
  personnel: UserPermission[];
  buildings: CustomBuilding[];
  onUpdate: (id: string, updates: Partial<UserPermission>) => void;
  onBulkAdd: (users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onDelete?: (id: string) => void;
  trigger: React.ReactNode;
}

type SortField = 'name' | 'staffCode' | 'building' | 'floor' | 'participation' | 'type';
type SortDirection = 'asc' | 'desc';

const VALID_ROLES: UserRole[] = ['viewer', 'reporter', 'responder', 'admin', 'super_admin'];

interface ParsedUser {
  userName: string;
  email: string;
  staffCode?: string;
  role: UserRole;
  buildingAccess: string[];
  primaryFloorId?: string;
  workDays: WorkDay[];
  isValid: boolean;
  errors: string[];
}

interface NewPersonnelForm {
  firstName: string;
  lastName: string;
  email: string;
  staffCode: string;
  buildingId: string;
  primaryFloorId: string;
  workDays: WorkDay[];
}

export function PersonnelDialog({ personnel, buildings, onUpdate, onBulkAdd, onDelete, trigger }: PersonnelDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPersonnel, setNewPersonnel] = useState<NewPersonnelForm>({
    firstName: '',
    lastName: '',
    email: '',
    staffCode: '',
    buildingId: '',
    primaryFloorId: '',
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });

  const resetNewPersonnelForm = () => {
    setNewPersonnel({
      firstName: '',
      lastName: '',
      email: '',
      staffCode: '',
      buildingId: '',
      primaryFloorId: '',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    });
  };

  const handleAddPersonnel = () => {
    if (!newPersonnel.firstName.trim() || !newPersonnel.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    // Validate staff code uniqueness if provided
    if (newPersonnel.staffCode.trim()) {
      const isDuplicate = personnel.some(p => p.staffCode?.toLowerCase() === newPersonnel.staffCode.trim().toLowerCase());
      if (isDuplicate) {
        toast.error('Staff code must be unique');
        return;
      }
      if (newPersonnel.staffCode.trim().length > STAFF_CODE_MAX_LENGTH) {
        toast.error(`Staff code must be ${STAFF_CODE_MAX_LENGTH} characters or less`);
        return;
      }
    }

    const userName = `${newPersonnel.firstName.trim()} ${newPersonnel.lastName.trim()}`;
    
    onBulkAdd([{
      userId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userName,
      email: newPersonnel.email.trim() || '',
      staffCode: newPersonnel.staffCode.trim() || undefined,
      role: 'reporter' as UserRole,
      buildingAccess: newPersonnel.buildingId ? [newPersonnel.buildingId] : [],
      primaryFloorId: newPersonnel.primaryFloorId || undefined,
      workDays: newPersonnel.workDays,
      safetyRoles: [] as SafetyRole[],
      canStartDrills: false,
      canResolveIncidents: false,
      canManageUsers: false,
    }]);

    toast.success(`${userName} added to personnel directory`);
    resetNewPersonnelForm();
    setShowAddForm(false);
  };

  const toggleNewPersonnelWorkDay = (day: WorkDay) => {
    setNewPersonnel(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const getFloorsForBuilding = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.floors || [];
  };

  const isSystemUser = (person: UserPermission) => {
    return person.role === 'admin' || person.role === 'super_admin' || person.canManageUsers;
  };

  const isManualPersonnel = (person: UserPermission) => {
    return person.userId.startsWith('manual-') || person.userId.startsWith('user-');
  };

  const getPersonnelType = (person: UserPermission) => {
    if (isSystemUser(person)) return 'system';
    return 'personnel';
  };

  const parseRole = (value: string): UserRole | null => {
    const normalized = value?.toLowerCase().trim().replace(/\s+/g, '_');
    if (VALID_ROLES.includes(normalized as UserRole)) {
      return normalized as UserRole;
    }
    return null;
  };

  const parseBuildingAccess = (value: string | string[]): string[] => {
    if (!value) return [];
    const names = Array.isArray(value) ? value : value.split(',').map(s => s.trim());
    if (names.length === 1 && names[0].toLowerCase() === 'all') {
      return buildings.map(b => b.id);
    }
    return names.map(name => {
      const building = buildings.find(b => b.name.toLowerCase() === name.toLowerCase().trim());
      return building?.id;
    }).filter(Boolean) as string[];
  };

  const parseFloorId = (value: string): string | undefined => {
    if (!value) return undefined;
    for (const building of buildings) {
      const floor = building.floors.find(f => 
        f.name.toLowerCase() === value.toLowerCase().trim() ||
        `${building.name} - ${f.name}`.toLowerCase() === value.toLowerCase().trim()
      );
      if (floor) return floor.id;
    }
    return undefined;
  };

  const parseWorkDays = (value: string): WorkDay[] => {
    if (!value) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayMap: Record<string, WorkDay> = {
      'mon': 'monday', 'monday': 'monday',
      'tue': 'tuesday', 'tuesday': 'tuesday',
      'wed': 'wednesday', 'wednesday': 'wednesday',
      'thu': 'thursday', 'thursday': 'thursday',
      'fri': 'friday', 'friday': 'friday',
      'sat': 'saturday', 'saturday': 'saturday',
      'sun': 'sunday', 'sunday': 'sunday',
    };
    return value.split(',').map(d => dayMap[d.toLowerCase().trim()]).filter(Boolean) as WorkDay[];
  };

  const validateAndParseUser = (row: any): ParsedUser => {
    const errors: string[] = [];
    
    const userName = (row['Name']?.toString().trim() || '');
    const email = (row['Email']?.toString().trim() || '');
    const staffCode = (row['Staff Code']?.toString().trim() || '');
    const roleStr = (row['Role']?.toString() || 'reporter');
    const buildingAccessValue = (row['Building']?.toString() || row['Building Access']?.toString() || '');
    const floorValue = (row['Floor']?.toString() || row['Primary Floor']?.toString() || '');
    const workDaysValue = (row['Work Days']?.toString() || '');

    if (!userName) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
    if (staffCode && staffCode.length > STAFF_CODE_MAX_LENGTH) {
      errors.push(`Staff code must be ${STAFF_CODE_MAX_LENGTH} characters or less`);
    }

    const role = parseRole(roleStr);
    if (!role) {
      errors.push(`Invalid role: ${roleStr}`);
    }

    const buildingAccess = parseBuildingAccess(buildingAccessValue);
    const primaryFloorId = parseFloorId(floorValue);
    const workDays = parseWorkDays(workDaysValue);

    return {
      userName,
      email,
      staffCode: staffCode || undefined,
      role: role || 'reporter',
      buildingAccess,
      primaryFloorId,
      workDays,
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedUser[] = jsonData.map((row: any) => validateAndParseUser(row));

      setParsedUsers(parsed);
      
      const validCount = parsed.filter(u => u.isValid).length;
      const invalidCount = parsed.length - validCount;
      
      if (invalidCount > 0) {
        toast.warning(`Parsed ${parsed.length} users. ${invalidCount} have errors.`);
      } else {
        toast.success(`Parsed ${parsed.length} users successfully`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Name': 'John Smith',
        'Email': 'john@example.com',
        'Staff Code': 'JS001',
        'Role': 'reporter',
        'Building': 'Main Office Building',
        'Floor': 'Ground Floor',
        'Work Days': 'Mon, Tue, Wed, Thu, Fri',
      },
      {
        'Name': 'Jane Doe',
        'Email': 'jane@example.com',
        'Staff Code': 'JD002',
        'Role': 'admin',
        'Building': 'Research Center',
        'Floor': 'First Floor',
        'Work Days': 'Mon, Tue, Wed',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel');
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
    ];

    XLSX.writeFile(wb, 'personnel_import_template.xlsx');
    toast.success('Template downloaded');
  };

  const handleImport = () => {
    const validUsers = parsedUsers.filter(u => u.isValid);
    if (validUsers.length === 0) {
      toast.error('No valid users to import');
      return;
    }

    // Check for duplicate staff codes within the import and against existing personnel
    const staffCodes = new Set<string>();
    const existingCodes = new Set(personnel.map(p => p.staffCode?.toLowerCase()).filter(Boolean));
    
    for (const user of validUsers) {
      if (user.staffCode) {
        const lowerCode = user.staffCode.toLowerCase();
        if (existingCodes.has(lowerCode) || staffCodes.has(lowerCode)) {
          toast.error(`Duplicate staff code found: ${user.staffCode}`);
          return;
        }
        staffCodes.add(lowerCode);
      }
    }

    const usersToAdd = validUsers.map(u => ({
      userId: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userName: u.userName,
      email: u.email,
      staffCode: u.staffCode,
      role: u.role,
      buildingAccess: u.buildingAccess,
      primaryFloorId: u.primaryFloorId,
      workDays: u.workDays,
      safetyRoles: [] as SafetyRole[],
      canStartDrills: false,
      canResolveIncidents: false,
      canManageUsers: false,
    }));

    onBulkAdd(usersToAdd);
    toast.success(`Imported ${validUsers.length} personnel successfully`);
    setParsedUsers([]);
    setShowUpload(false);
  };

  const cancelUpload = () => {
    setParsedUsers([]);
    setShowUpload(false);
  };

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

  const getDrillParticipation = (person: UserPermission) => {
    const completedDrills = mockDrills.filter(d => d.status === 'completed');
    if (completedDrills.length === 0) return { rate: 0, participated: 0, total: 0 };

    const participatedDrills = completedDrills.filter(drill => {
      return mockCheckIns.some(
        checkIn => checkIn.drillId === drill.id && 
        checkIn.personName.toLowerCase().includes(person.userName.toLowerCase().split(' ')[0])
      );
    });

    const rate = Math.round((participatedDrills.length / completedDrills.length) * 100);
    return { rate, participated: participatedDrills.length, total: completedDrills.length };
  };

  const enhancedPersonnel = useMemo(() => {
    return personnel.map(person => {
      const location = getLocationInfo(person);
      const participation = getDrillParticipation(person);
      const nameParts = person.userName.split(' ');
      const firstName = nameParts[0] || '';
      const surname = nameParts.slice(1).join(' ') || '';
      const personnelType = getPersonnelType(person);
      
      return {
        ...person,
        firstName,
        surname,
        ...location,
        participation,
        personnelType,
      };
    });
  }, [personnel, buildings]);

  const filteredPersonnel = useMemo(() => {
    let result = enhancedPersonnel;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.userName.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        (p.staffCode && p.staffCode.toLowerCase().includes(query)) ||
        p.buildingName.toLowerCase().includes(query) ||
        p.floorName.toLowerCase().includes(query)
      );
    }

    if (filterBuilding !== 'all') {
      result = result.filter(p => p.buildingAccess.includes(filterBuilding));
    }

    if (filterType !== 'all') {
      result = result.filter(p => p.personnelType === filterType);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'staffCode':
          comparison = (a.staffCode || '').localeCompare(b.staffCode || '');
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
        case 'type':
          comparison = a.personnelType.localeCompare(b.personnelType);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enhancedPersonnel, searchQuery, filterBuilding, filterType, sortField, sortDirection]);

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

  const systemUsersCount = enhancedPersonnel.filter(p => p.personnelType === 'system').length;
  const manualPersonnelCount = enhancedPersonnel.filter(p => p.personnelType === 'personnel').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Personnel Directory ({personnel.length} total)
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant={showAddForm ? "secondary" : "default"}
                size="sm"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  if (showUpload) setShowUpload(false);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Personnel'}
              </Button>
              <Button
                variant={showUpload ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setShowUpload(!showUpload);
                  if (showAddForm) setShowAddForm(false);
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                {showUpload ? 'Hide Upload' : 'Import from File'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Add Personnel Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add New Personnel
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={newPersonnel.firstName}
                  onChange={(e) => setNewPersonnel(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={newPersonnel.lastName}
                  onChange={(e) => setNewPersonnel(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newPersonnel.email}
                  onChange={(e) => setNewPersonnel(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.smith@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Code</Label>
                <Input
                  value={newPersonnel.staffCode}
                  onChange={(e) => setNewPersonnel(prev => ({ ...prev, staffCode: e.target.value.slice(0, STAFF_CODE_MAX_LENGTH) }))}
                  placeholder="e.g. JS001"
                  maxLength={STAFF_CODE_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground">Max 8 characters, must be unique</p>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <Select 
                  value={newPersonnel.buildingId || 'none'} 
                  onValueChange={(value) => setNewPersonnel(prev => ({ 
                    ...prev, 
                    buildingId: value === 'none' ? '' : value,
                    primaryFloorId: '' 
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
              <div className="space-y-2">
                <Label>Primary Floor</Label>
                <Select 
                  value={newPersonnel.primaryFloorId || 'none'} 
                  onValueChange={(value) => setNewPersonnel(prev => ({ ...prev, primaryFloorId: value === 'none' ? '' : value }))}
                  disabled={!newPersonnel.buildingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No primary floor</SelectItem>
                    {getFloorsForBuilding(newPersonnel.buildingId).map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.name}
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
                    onClick={() => toggleNewPersonnelWorkDay(day)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      newPersonnel.workDays.includes(day)
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
              <Button variant="outline" size="sm" onClick={() => { resetNewPersonnelForm(); setShowAddForm(false); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddPersonnel}>
                <Plus className="w-4 h-4 mr-1" />
                Add Personnel
              </Button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {showUpload && (
          <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Import Personnel from Excel/CSV
              </h4>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" />
                  Download Template
                </Button>
              </div>
            </div>

            {parsedUsers.length === 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="personnel-upload-input"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Select File'}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls, and .csv files
                  </span>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Required columns:</p>
                    <ul className="text-sm list-disc list-inside space-y-0.5">
                      <li><strong>Name</strong> - Full name (required)</li>
                      <li><strong>Email</strong> - Email address (required)</li>
                      <li><strong>Staff Code</strong> - Unique identifier (max 8 chars)</li>
                      <li><strong>Role</strong> - viewer, reporter, responder, admin, or super_admin</li>
                      <li><strong>Building</strong> - Building name or "All"</li>
                      <li><strong>Floor</strong> - Primary floor name</li>
                      <li><strong>Work Days</strong> - e.g., "Mon, Tue, Wed, Thu, Fri"</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-safe/10 text-safe">
                      {parsedUsers.filter(u => u.isValid).length} valid
                    </Badge>
                    {parsedUsers.filter(u => !u.isValid).length > 0 && (
                      <Badge variant="outline" className="bg-emergency/10 text-emergency">
                        {parsedUsers.filter(u => !u.isValid).length} with errors
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelUpload}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleImport} disabled={parsedUsers.filter(u => u.isValid).length === 0}>
                      Import {parsedUsers.filter(u => u.isValid).length} Personnel
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-40 border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Building</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedUsers.map((user, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {user.isValid ? (
                              <Badge variant="outline" className="bg-safe/10 text-safe">Valid</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emergency/10 text-emergency">Error</Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.userName || '-'}</TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>
                            {user.buildingAccess.length > 0 
                              ? buildings.find(b => b.id === user.buildingAccess[0])?.name || '-'
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-emergency text-sm">
                            {user.errors.join(', ') || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Type Summary */}
        <div className="flex gap-4 text-sm text-muted-foreground py-2 border-b">
          <span className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">System</Badge>
            {systemUsersCount} system users
          </span>
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">Personnel</Badge>
            {manualPersonnelCount} personnel
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, staff code, building..."
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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="system">System Users</SelectItem>
              <SelectItem value="personnel">Personnel</SelectItem>
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('staffCode')}
                >
                  Staff Code <SortIcon field="staffCode" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('type')}
                >
                  Type <SortIcon field="type" />
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
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery || filterBuilding !== 'all' || filterType !== 'all'
                      ? 'No personnel match your filters'
                      : 'No personnel configured yet. Add personnel manually or import from file.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map(person => (
                  <PersonnelRow
                    key={person.id}
                    person={person}
                    buildings={buildings}
                    allPersonnel={personnel}
                    isEditing={editingPersonId === person.id}
                    onEdit={() => setEditingPersonId(person.id)}
                    onSave={(updates) => {
                      onUpdate(person.id, updates);
                      setEditingPersonId(null);
                      toast.success('Personnel updated successfully');
                    }}
                    onCancel={() => setEditingPersonId(null)}
                    onDelete={onDelete && !isSystemUser(person) ? () => {
                      onDelete(person.id);
                      toast.success('Personnel removed');
                    } : undefined}
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
    personnelType: string;
  };
  buildings: CustomBuilding[];
  allPersonnel: UserPermission[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<UserPermission>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  getParticipationColor: (rate: number) => string;
}

function PersonnelRow({ person, buildings, allPersonnel, isEditing, onEdit, onSave, onCancel, onDelete, getParticipationColor }: PersonnelRowProps) {
  const [editData, setEditData] = useState({
    userName: person.userName,
    staffCode: person.staffCode || '',
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

  const validateStaffCode = (code: string): string | null => {
    if (!code.trim()) return null;
    if (code.trim().length > STAFF_CODE_MAX_LENGTH) {
      return `Staff code must be ${STAFF_CODE_MAX_LENGTH} characters or less`;
    }
    const isDuplicate = allPersonnel.some(
      p => p.id !== person.id && p.staffCode?.toLowerCase() === code.trim().toLowerCase()
    );
    if (isDuplicate) {
      return 'Staff code must be unique';
    }
    return null;
  };

  if (isEditing) {
    const staffCodeError = validateStaffCode(editData.staffCode);
    
    return (
      <TableRow className="bg-muted/30">
        <TableCell colSpan={9}>
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
                <Label>Staff Code</Label>
                <Input
                  value={editData.staffCode}
                  onChange={(e) => setEditData(prev => ({ ...prev, staffCode: e.target.value.slice(0, STAFF_CODE_MAX_LENGTH) }))}
                  placeholder="e.g. ABC123"
                  maxLength={STAFF_CODE_MAX_LENGTH}
                  className={staffCodeError ? 'border-destructive' : ''}
                />
                {staffCodeError && (
                  <p className="text-xs text-destructive">{staffCodeError}</p>
                )}
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
              <Button 
                size="sm" 
                onClick={() => onSave({ ...editData, staffCode: editData.staffCode.trim() || undefined })}
                disabled={!!staffCodeError}
              >
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
      <TableCell>
        {person.staffCode ? (
          <Badge variant="outline" className="font-mono text-xs">
            {person.staffCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell>
        {person.personnelType === 'system' ? (
          <Badge variant="secondary" className="text-xs">System</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">Personnel</Badge>
        )}
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="w-4 h-4" />
          </Button>
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
