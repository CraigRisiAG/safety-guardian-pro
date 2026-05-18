import { useState } from 'react';
import { Plus, Users, Trash2, Edit2, Shield, Building2, Calendar, Flame, HardHat, HeartPulse, ShieldCheck, Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPermission, UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS, CustomBuilding, WorkDay, WORK_DAY_LABELS, ALL_WORK_DAYS, SafetyRole, SAFETY_ROLE_LABELS, SAFETY_ROLE_COLORS, ALL_SAFETY_ROLES } from '@/types/admin';
import { BulkUserUpload } from './BulkUserUpload';
import { toast } from 'sonner';
import { ensureCredentialForRole } from '@/lib/authAccounts';
import { getRolePermissionDefaults } from '@/lib/personnelAccess';

interface UserPermissionsManagerProps {
  permissions: UserPermission[];
  buildings: CustomBuilding[];
  onAdd: (permission: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>) => UserPermission;
  onBulkAdd: (users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onUpdate: (id: string, updates: Partial<UserPermission>) => void;
  onDelete: (id: string) => void;
}

const roleColors: Record<UserRole, string> = {
  viewer: 'bg-muted text-muted-foreground',
  reporter: 'bg-info-muted text-info',
  responder: 'bg-warning-muted text-warning',
  admin: 'bg-safe-muted text-safe',
  super_admin: 'bg-emergency-muted text-emergency',
};

export function UserPermissionsManager({ permissions, buildings, onAdd, onBulkAdd, onUpdate, onDelete }: UserPermissionsManagerProps) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPermission | null>(null);
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    role: 'viewer' as UserRole,
    buildingAccess: [] as string[],
    primaryFloorId: '',
    primaryAreaId: '',
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as WorkDay[],
    safetyRoles: [] as SafetyRole[],
    canStartDrills: false,
    canResolveIncidents: false,
    canManageUsers: false,
  });

  // Get all floors from all buildings for filtering
  const allFloors = buildings.flatMap(building => 
    building.floors.map(floor => ({
      id: floor.id,
      name: floor.name,
      buildingId: building.id,
      buildingName: building.name,
    }))
  );

  // Filter permissions by selected floor
  const filteredPermissions = floorFilter === 'all' 
    ? permissions 
    : permissions.filter(p => p.primaryFloorId === floorFilter);

  const resetForm = () => {
    setFormData({
      userName: '',
      email: '',
      role: 'viewer',
      buildingAccess: [],
      primaryFloorId: '',
      primaryAreaId: '',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      safetyRoles: [],
      canStartDrills: false,
      canResolveIncidents: false,
      canManageUsers: false,
    });
  };

  const handleAddUser = async () => {
    if (!formData.userName.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    const generatedUserId = `user-${Date.now()}`;

    onAdd({
      userId: generatedUserId,
      userName: formData.userName.trim(),
      email: formData.email.trim(),
      role: formData.role,
      buildingAccess: formData.buildingAccess,
      primaryFloorId: formData.primaryFloorId || undefined,
      primaryAreaId: formData.primaryAreaId || undefined,
      workDays: formData.workDays,
      safetyRoles: formData.safetyRoles,
      canStartDrills: formData.canStartDrills,
      canResolveIncidents: formData.canResolveIncidents,
      canManageUsers: formData.canManageUsers,
    });

    if (formData.role !== 'viewer') {
      const credential = await ensureCredentialForRole({
        userId: generatedUserId,
        email: formData.email.trim(),
        name: formData.userName.trim(),
        role: formData.role,
        forceResetPassword: true,
      });

      if (credential.temporaryPassword) {
        toast.info(`Temporary password for ${formData.userName.trim()}: ${credential.temporaryPassword}`);
      }
    }

    resetForm();
    setIsAddingUser(false);
    toast.success('User added successfully');
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const previousRole = editingUser.role;

    onUpdate(editingUser.id, {
      userName: formData.userName,
      email: formData.email,
      role: formData.role,
      buildingAccess: formData.buildingAccess,
      primaryFloorId: formData.primaryFloorId || undefined,
      primaryAreaId: formData.primaryAreaId || undefined,
      workDays: formData.workDays,
      safetyRoles: formData.safetyRoles,
      canStartDrills: formData.canStartDrills,
      canResolveIncidents: formData.canResolveIncidents,
      canManageUsers: formData.canManageUsers,
    });

    if (formData.role !== 'viewer') {
      const credential = await ensureCredentialForRole({
        userId: editingUser.userId,
        email: formData.email.trim(),
        name: formData.userName.trim(),
        role: formData.role,
        forceResetPassword: previousRole === 'viewer',
      });

      if (credential.temporaryPassword) {
        toast.info(`Temporary password for ${formData.userName.trim()}: ${credential.temporaryPassword}`);
      }
    }

    resetForm();
    setEditingUser(null);
    toast.success('User updated successfully');
  };

  const handleBulkAddUsers = async (users: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    onBulkAdd(users);

    const elevatedUsers = users.filter((user) => user.role !== 'viewer');
    for (const user of elevatedUsers) {
      const credential = await ensureCredentialForRole({
        userId: user.userId,
        email: user.email,
        name: user.userName,
        role: user.role,
        forceResetPassword: true,
      });

      if (credential.temporaryPassword) {
        toast.info(`Temporary password for ${user.userName}: ${credential.temporaryPassword}`);
      }
    }
  };

  const openEditDialog = (user: UserPermission) => {
    setFormData({
      userName: user.userName,
      email: user.email,
      role: user.role,
      buildingAccess: user.buildingAccess,
      primaryFloorId: user.primaryFloorId || '',
      primaryAreaId: user.primaryAreaId || '',
      workDays: user.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      safetyRoles: user.safetyRoles || [],
      canStartDrills: user.canStartDrills,
      canResolveIncidents: user.canResolveIncidents,
      canManageUsers: user.canManageUsers,
    });
    setEditingUser(user);
  };

  const toggleBuildingAccess = (buildingId: string) => {
    setFormData(prev => ({
      ...prev,
      buildingAccess: prev.buildingAccess.includes(buildingId)
        ? prev.buildingAccess.filter(id => id !== buildingId)
        : [...prev.buildingAccess, buildingId],
    }));
  };

  const getAreasForFloor = (floorId: string) => {
    const floor = buildings.flatMap((building) => building.floors).find((entry) => entry.id === floorId);
    return floor?.areas ?? [];
  };

  const handleRoleChange = (role: UserRole) => {
    const defaults = getRolePermissionDefaults(role);
    setFormData((prev) => ({
      ...prev,
      role,
      ...defaults,
    }));
  };

  const toggleWorkDay = (day: WorkDay) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const toggleSafetyRole = (role: SafetyRole) => {
    setFormData(prev => ({
      ...prev,
      safetyRoles: prev.safetyRoles.includes(role)
        ? prev.safetyRoles.filter(r => r !== role)
        : [...prev.safetyRoles, role],
    }));
  };

  const getSafetyRoleIcon = (role: SafetyRole) => {
    switch (role) {
      case 'fire_marshall': return Flame;
      case 'evacuation_warden': return HardHat;
      case 'first_aider': return HeartPulse;
      case 'health_safety_officer': return ShieldCheck;
    }
  };

  const UserFormContent = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">Name *</Label>
          <Input
            id="user-name"
            placeholder="John Smith"
            value={formData.userName}
            onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">Email *</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={formData.role} onValueChange={handleRoleChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                <div className="flex flex-col">
                  <span>{ROLE_LABELS[role]}</span>
                  <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Building Access</Label>
        <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
          {buildings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buildings configured</p>
          ) : (
            buildings.map((building) => (
              <div key={building.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`building-${building.id}`}
                  checked={formData.buildingAccess.includes(building.id)}
                  onCheckedChange={() => toggleBuildingAccess(building.id)}
                />
                <label htmlFor={`building-${building.id}`} className="text-sm cursor-pointer">
                  {building.name}
                </label>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Primary Floor Assignment
        </Label>
        <Select 
          value={formData.primaryFloorId || 'none'} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, primaryFloorId: value === 'none' ? '' : value, primaryAreaId: '' }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select primary floor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No primary floor</span>
            </SelectItem>
            {allFloors.map((floor) => (
              <SelectItem key={floor.id} value={floor.id}>
                {floor.buildingName} - {floor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">The floor where this person typically works</p>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Primary Area Assignment
        </Label>
        <Select
          value={formData.primaryAreaId || 'none'}
          onValueChange={(value) => setFormData(prev => ({ ...prev, primaryAreaId: value === 'none' ? '' : value }))}
          disabled={!formData.primaryFloorId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select primary area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">No primary area</span>
            </SelectItem>
            {getAreasForFloor(formData.primaryFloorId).map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Admins and responders are scoped by this area</p>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Work Days
        </Label>
        <div className="flex flex-wrap gap-2">
          {ALL_WORK_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleWorkDay(day)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                formData.workDays.includes(day)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {WORK_DAY_LABELS[day]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Select the days this person normally works in the office</p>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Safety Roles
        </Label>
        <div className="flex flex-wrap gap-2">
          {ALL_SAFETY_ROLES.map((role) => {
            const Icon = getSafetyRoleIcon(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleSafetyRole(role)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5 ${
                  formData.safetyRoles.includes(role)
                    ? SAFETY_ROLE_COLORS[role]
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {SAFETY_ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Assign emergency preparedness roles (fire marshall, first aid, etc.)</p>
      </div>
      <div className="space-y-3">
        <Label>Permissions</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="can-start-drills"
              checked={formData.canStartDrills}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, canStartDrills: !!checked }))}
            />
            <label htmlFor="can-start-drills" className="text-sm cursor-pointer">Can start drills</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="can-resolve-incidents"
              checked={formData.canResolveIncidents}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, canResolveIncidents: !!checked }))}
            />
            <label htmlFor="can-resolve-incidents" className="text-sm cursor-pointer">Can resolve incidents</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="can-manage-users"
              checked={formData.canManageUsers}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, canManageUsers: !!checked }))}
            />
            <label htmlFor="can-manage-users" className="text-sm cursor-pointer">Can manage users</label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Permissions
          </CardTitle>
          <CardDescription>
            Manage user roles and access controls
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <BulkUserUpload buildings={buildings} onBulkAdd={handleBulkAddUsers} />
          <Dialog open={isAddingUser} onOpenChange={(open) => { setIsAddingUser(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user with specific permissions.
              </DialogDescription>
            </DialogHeader>
            <UserFormContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddingUser(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Floor Filter */}
        {permissions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Floor:</span>
            </div>
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    All Users ({permissions.length})
                  </div>
                </SelectItem>
                {allFloors.map((floor) => {
                  const count = permissions.filter(p => p.primaryFloorId === floor.id).length;
                  return (
                    <SelectItem key={floor.id} value={floor.id}>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        {floor.buildingName} - {floor.name} ({count})
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {floorFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFloorFilter('all')}>
                Clear filter
              </Button>
            )}
          </div>
        )}

        {permissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users configured yet.</p>
            <p className="text-sm">Click "Add User" to get started.</p>
          </div>
        ) : filteredPermissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users assigned to this floor.</p>
            <p className="text-sm">Users need a primary floor assignment to appear here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Primary Floor</TableHead>
                <TableHead className="hidden md:table-cell">Work Days</TableHead>
                <TableHead className="hidden lg:table-cell">Safety Roles</TableHead>
                <TableHead className="hidden xl:table-cell">Building Access</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((permission) => {
                const primaryFloor = allFloors.find(f => f.id === permission.primaryFloorId);
                return (
                <TableRow key={permission.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{permission.userName}</p>
                      <p className="text-sm text-muted-foreground">{permission.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[permission.role]}>
                      {ROLE_LABELS[permission.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {primaryFloor ? (
                      <Badge variant="outline" className="text-xs">
                        <Layers className="w-3 h-3 mr-1" />
                        {primaryFloor.buildingName} - {primaryFloor.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-0.5">
                      {(permission.workDays || []).length === 0 ? (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      ) : (
                        ALL_WORK_DAYS.map((day) => (
                          <span
                            key={day}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              (permission.workDays || []).includes(day)
                                ? 'bg-primary/20 text-primary font-medium'
                                : 'bg-muted text-muted-foreground/40'
                            }`}
                          >
                            {WORK_DAY_LABELS[day][0]}
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(permission.safetyRoles || []).length === 0 ? (
                        <span className="text-sm text-muted-foreground">None</span>
                      ) : (
                        (permission.safetyRoles || []).map((role) => {
                          const Icon = getSafetyRoleIcon(role);
                          return (
                            <Badge key={role} variant="outline" className={`text-xs ${SAFETY_ROLE_COLORS[role]}`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {SAFETY_ROLE_LABELS[role]}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {permission.buildingAccess.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No access</span>
                      ) : (
                        permission.buildingAccess.slice(0, 2).map((buildingId) => {
                          const building = buildings.find(b => b.id === buildingId);
                          return (
                            <Badge key={buildingId} variant="outline" className="text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              {building?.name || buildingId}
                            </Badge>
                          );
                        })
                      )}
                      {permission.buildingAccess.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{permission.buildingAccess.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Dialog open={editingUser?.id === permission.id} onOpenChange={(open) => { if (!open) { setEditingUser(null); resetForm(); } }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(permission)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <UserFormContent />
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setEditingUser(null); resetForm(); }}>Cancel</Button>
                            <Button onClick={handleUpdateUser}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{permission.userName}" and their permissions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(permission.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
