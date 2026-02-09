import { useState, useMemo } from 'react';
import { Plus, Calendar, Users, Building2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ComplianceCheck, ComplianceCategory, CustomBuilding, UserPermission, SAFETY_ROLE_LABELS } from '@/types/admin';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { userCanPerformCheckCategory, getQualifiedRolesDescription } from '@/utils/complianceRoles';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuickCheckAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  onCheckCreated?: (check: ComplianceCheck) => void;
}

export function QuickCheckAssignment({ 
  open, 
  onOpenChange, 
  initialDate,
  onCheckCreated 
}: QuickCheckAssignmentProps) {
  const { user } = useAuth();
  const { settings, addComplianceCheck } = useAdminSettings();
  
  // Determine if current user is admin/super_admin
  const currentUserPermission = useMemo(() => {
    if (!user) return null;
    return settings.userPermissions.find(
      p => p.email.toLowerCase() === user.email.toLowerCase() || p.userId === user.id
    );
  }, [user, settings.userPermissions]);

  const isAdmin = currentUserPermission?.role === 'admin' || currentUserPermission?.role === 'super_admin';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: settings.complianceCategories[0]?.id || '',
    dueDate: initialDate || new Date(),
    buildingIds: [] as string[],
    assignedUsers: [] as string[],
    assignToSelf: !isAdmin, // Non-admins assign to self by default
  });

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData({
        name: '',
        description: '',
        category: settings.complianceCategories[0]?.id || '',
        dueDate: initialDate || new Date(),
        buildingIds: [],
        assignedUsers: [],
        assignToSelf: !isAdmin,
      });
    }
    onOpenChange(newOpen);
  };

  // Get qualified users for selected category
  const qualifiedUsers = useMemo(() => {
    return settings.userPermissions.filter(user => 
      userCanPerformCheckCategory(user.safetyRoles, formData.category)
    );
  }, [settings.userPermissions, formData.category]);

  const toggleBuilding = (buildingId: string) => {
    setFormData(prev => ({
      ...prev,
      buildingIds: prev.buildingIds.includes(buildingId)
        ? prev.buildingIds.filter(id => id !== buildingId)
        : [...prev.buildingIds, buildingId],
    }));
  };

  const toggleUser = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Check name is required');
      return;
    }

    // Determine assigned users
    let assignedUserIds = formData.assignedUsers;
    if (formData.assignToSelf && currentUserPermission) {
      assignedUserIds = [currentUserPermission.id];
    }

    if (assignedUserIds.length === 0) {
      toast.error('Please assign at least one user');
      return;
    }

    const newCheck = addComplianceCheck({
      name: formData.name.trim(),
      description: formData.description.trim(),
      frequency: 'monthly', // Default, can be modified in full admin panel
      buildingIds: formData.buildingIds,
      nextDue: formData.dueDate,
      status: 'pending',
      category: formData.category,
      assignedUsers: assignedUserIds,
      isRecurring: false, // Quick assignments are one-off by default
      reminderDaysBefore: 1,
    });

    toast.success('Compliance check assigned successfully');
    onCheckCreated?.(newCheck);
    onOpenChange(false);
  };

  // Check if current user can assign this category to themselves
  const canAssignToSelf = currentUserPermission && 
    userCanPerformCheckCategory(currentUserPermission.safetyRoles, formData.category);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Assign Compliance Check
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? 'Create and assign a new compliance check to qualified users.'
              : 'Assign a compliance check to yourself.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Check Name */}
          <div className="space-y-2">
            <Label>Check Name *</Label>
            <Input
              placeholder="e.g., Fire Extinguisher Inspection"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what this check involves..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Category & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  category: value,
                  assignedUsers: [], // Reset users when category changes
                  assignToSelf: !isAdmin && userCanPerformCheckCategory(
                    currentUserPermission?.safetyRoles || [], 
                    value
                  )
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.complianceCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, dueDate: date }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Buildings */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Buildings
            </Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-28 overflow-y-auto">
              {settings.buildings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No buildings configured.
                </p>
              ) : (
                settings.buildings.map((building) => (
                  <div key={building.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.buildingIds.includes(building.id)}
                      onCheckedChange={() => toggleBuilding(building.id)}
                    />
                    <label className="text-sm cursor-pointer">{building.name}</label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assign To
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">
                      Only users with relevant safety roles can be assigned.
                      For this category: {getQualifiedRolesDescription(formData.category)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>

            {/* Info about qualified roles */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              <Info className="w-3 h-3 shrink-0" />
              <span>Qualified roles: {getQualifiedRolesDescription(formData.category)}</span>
            </div>

            {/* Self-assignment for non-admins */}
            {!isAdmin && (
              <div className="p-3 border rounded-lg bg-muted/30">
                {canAssignToSelf ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.assignToSelf}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, assignToSelf: !!checked }))}
                    />
                    <label className="text-sm cursor-pointer">
                      Assign to myself ({currentUserPermission?.userName})
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-warning">
                    You don't have the required safety role for this check type.
                    Required: {getQualifiedRolesDescription(formData.category)}
                  </p>
                )}
              </div>
            )}

            {/* Admin user selection */}
            {isAdmin && (
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {qualifiedUsers.length === 0 ? (
                  <p className="text-sm text-warning text-center py-2">
                    No users have the required safety roles for this category.
                  </p>
                ) : (
                  qualifiedUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.assignedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {user.userName}
                        <span className="text-muted-foreground ml-2">({user.email})</span>
                      </label>
                      {user.safetyRoles.length > 0 && (
                        <div className="flex gap-1">
                          {user.safetyRoles.slice(0, 2).map(role => (
                            <Badge key={role} variant="outline" className="text-xs bg-safe-muted/50">
                              {SAFETY_ROLE_LABELS[role]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {isAdmin && formData.assignedUsers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {formData.assignedUsers.length} user(s) selected
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
