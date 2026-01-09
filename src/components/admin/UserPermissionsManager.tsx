import { useState } from 'react';
import { Plus, Users, Trash2, Edit2, Shield, Building2 } from 'lucide-react';
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
import { UserPermission, UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS, CustomBuilding } from '@/types/admin';
import { toast } from 'sonner';

interface UserPermissionsManagerProps {
  permissions: UserPermission[];
  buildings: CustomBuilding[];
  onAdd: (permission: Omit<UserPermission, 'id' | 'createdAt' | 'updatedAt'>) => UserPermission;
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

export function UserPermissionsManager({ permissions, buildings, onAdd, onUpdate, onDelete }: UserPermissionsManagerProps) {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPermission | null>(null);
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    role: 'reporter' as UserRole,
    buildingAccess: [] as string[],
    canStartDrills: false,
    canResolveIncidents: false,
    canManageUsers: false,
  });

  const resetForm = () => {
    setFormData({
      userName: '',
      email: '',
      role: 'reporter',
      buildingAccess: [],
      canStartDrills: false,
      canResolveIncidents: false,
      canManageUsers: false,
    });
  };

  const handleAddUser = () => {
    if (!formData.userName.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    onAdd({
      userId: `user-${Date.now()}`,
      userName: formData.userName.trim(),
      email: formData.email.trim(),
      role: formData.role,
      buildingAccess: formData.buildingAccess,
      canStartDrills: formData.canStartDrills,
      canResolveIncidents: formData.canResolveIncidents,
      canManageUsers: formData.canManageUsers,
    });
    resetForm();
    setIsAddingUser(false);
    toast.success('User added successfully');
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    onUpdate(editingUser.id, {
      userName: formData.userName,
      email: formData.email,
      role: formData.role,
      buildingAccess: formData.buildingAccess,
      canStartDrills: formData.canStartDrills,
      canResolveIncidents: formData.canResolveIncidents,
      canManageUsers: formData.canManageUsers,
    });
    resetForm();
    setEditingUser(null);
    toast.success('User updated successfully');
  };

  const openEditDialog = (user: UserPermission) => {
    setFormData({
      userName: user.userName,
      email: user.email,
      role: user.role,
      buildingAccess: user.buildingAccess,
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
        <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
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
        <Dialog open={isAddingUser} onOpenChange={(open) => { setIsAddingUser(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
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
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users configured yet.</p>
            <p className="text-sm">Click "Add User" to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Building Access</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
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
                  <TableCell>
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
                    <div className="flex flex-wrap gap-1">
                      {permission.canStartDrills && <Badge variant="secondary" className="text-xs">Drills</Badge>}
                      {permission.canResolveIncidents && <Badge variant="secondary" className="text-xs">Incidents</Badge>}
                      {permission.canManageUsers && <Badge variant="secondary" className="text-xs">Users</Badge>}
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
                        <DialogContent className="max-w-lg">
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
