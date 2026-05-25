import { useState, useMemo } from 'react';
import { Plus, Calendar, Users, Building2, Info, Layers, MapPin, Repeat } from 'lucide-react';
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
import { getMonthlyWeekLabels, WEEKDAY_LABELS } from '@/utils/complianceRecurrence';
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
    floorIds: [] as string[],
    areaIds: [] as string[],
    assignedUsers: [] as string[],
    assignToSelf: !isAdmin, // Non-admins assign to self by default
    recurrencePattern: 'none' as NonNullable<ComplianceCheck['recurrencePattern']>,
    recurrenceWeekOfMonth: 1 as 1 | 2 | 3 | 4 | 'last',
    recurrenceWeekday: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
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
        floorIds: [],
        areaIds: [],
        assignedUsers: [],
        assignToSelf: !isAdmin,
        recurrencePattern: 'none',
        recurrenceWeekOfMonth: 1,
        recurrenceWeekday: 1,
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
    setFormData(prev => {
      const nextBuildingIds = prev.buildingIds.includes(buildingId)
        ? prev.buildingIds.filter(id => id !== buildingId)
        : [...prev.buildingIds, buildingId];

      const nextFloors = settings.buildings
        .filter((building) => nextBuildingIds.includes(building.id))
        .flatMap((building) => building.floors.map((floor) => floor.id));

      const nextFloorIds = prev.floorIds.filter((id) => nextFloors.includes(id));
      const nextAreas = settings.buildings
        .filter((building) => nextBuildingIds.includes(building.id))
        .flatMap((building) => building.floors)
        .filter((floor) => nextFloorIds.includes(floor.id))
        .flatMap((floor) => floor.areas.map((area) => area.id));

      return {
        ...prev,
        buildingIds: nextBuildingIds,
        floorIds: nextFloorIds,
        areaIds: prev.areaIds.filter((id) => nextAreas.includes(id)),
      };
    });
  };

  const toggleFloor = (floorId: string) => {
    setFormData((prev) => {
      const nextFloorIds = prev.floorIds.includes(floorId)
        ? prev.floorIds.filter((id) => id !== floorId)
        : [...prev.floorIds, floorId];

      const nextAreas = settings.buildings
        .filter((building) => prev.buildingIds.includes(building.id))
        .flatMap((building) => building.floors)
        .filter((floor) => nextFloorIds.includes(floor.id))
        .flatMap((floor) => floor.areas.map((area) => area.id));

      return {
        ...prev,
        floorIds: nextFloorIds,
        areaIds: prev.areaIds.filter((id) => nextAreas.includes(id)),
      };
    });
  };

  const toggleArea = (areaId: string) => {
    setFormData((prev) => ({
      ...prev,
      areaIds: prev.areaIds.includes(areaId)
        ? prev.areaIds.filter((id) => id !== areaId)
        : [...prev.areaIds, areaId],
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
      floorIds: formData.floorIds,
      areaIds: formData.areaIds,
      nextDue: formData.dueDate,
      status: 'pending',
      category: formData.category,
      assignedUsers: assignedUserIds,
      isRecurring: formData.recurrencePattern !== 'none',
      recurrencePattern: formData.recurrencePattern,
      recurrenceWeekOfMonth:
        formData.recurrencePattern === 'monthly_week_of_month'
          ? formData.recurrenceWeekOfMonth
          : undefined,
      recurrenceWeekday:
        formData.recurrencePattern === 'monthly_week_of_month'
          ? formData.recurrenceWeekday
          : undefined,
      startDate: formData.recurrencePattern !== 'none' ? formData.dueDate : undefined,
      reminderDaysBefore: 1,
    });

    toast.success('Compliance check assigned successfully');
    onCheckCreated?.(newCheck);
    onOpenChange(false);
  };

  // Check if current user can assign this category to themselves
  const canAssignToSelf = currentUserPermission && 
    userCanPerformCheckCategory(currentUserPermission.safetyRoles, formData.category);

  const selectedBuildings = useMemo(
    () => settings.buildings.filter((building) => formData.buildingIds.includes(building.id)),
    [settings.buildings, formData.buildingIds],
  );

  const availableFloors = useMemo(
    () => selectedBuildings.flatMap((building) => building.floors),
    [selectedBuildings],
  );

  const availableAreas = useMemo(
    () => availableFloors
      .filter((floor) => formData.floorIds.includes(floor.id))
      .flatMap((floor) => floor.areas),
    [availableFloors, formData.floorIds],
  );

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

          {/* Floors */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Floors (Optional)
            </Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
              {availableFloors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Select one or more buildings first.
                </p>
              ) : (
                availableFloors.map((floor) => (
                  <div key={floor.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.floorIds.includes(floor.id)}
                      onCheckedChange={() => toggleFloor(floor.id)}
                    />
                    <label className="text-sm cursor-pointer">{floor.name}</label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Areas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Areas (Optional)
            </Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
              {availableAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Select one or more floors to target specific areas.
                </p>
              ) : (
                availableAreas.map((area) => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.areaIds.includes(area.id)}
                      onCheckedChange={() => toggleArea(area.id)}
                    />
                    <label className="text-sm cursor-pointer">{area.name}</label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Recurrence
            </Label>
            <div className="border rounded-lg p-3 space-y-3">
              <div className="space-y-2">
                <Label>Recurrence mode</Label>
                <Select
                  value={formData.recurrencePattern}
                  onValueChange={(value: NonNullable<ComplianceCheck['recurrencePattern']>) =>
                    setFormData((prev) => ({ ...prev, recurrencePattern: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-off (no recurrence)</SelectItem>
                    <SelectItem value="monthly_same_date">Same date each month ({format(formData.dueDate, 'do')})</SelectItem>
                    <SelectItem value="monthly_last_day">Last day of month</SelectItem>
                    <SelectItem value="monthly_last_working_day">Last working day of month</SelectItem>
                    <SelectItem value="monthly_week_of_month">Specific week + weekday of month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrencePattern === 'monthly_week_of_month' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Week of month</Label>
                    <Select
                      value={String(formData.recurrenceWeekOfMonth)}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrenceWeekOfMonth:
                            value === 'last'
                              ? 'last'
                              : (parseInt(value, 10) as 1 | 2 | 3 | 4),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthlyWeekLabels().map((entry) => (
                          <SelectItem key={entry.value} value={entry.value}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Weekday</Label>
                    <Select
                      value={String(formData.recurrenceWeekday)}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurrenceWeekday: parseInt(value, 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAY_LABELS.map((entry) => (
                          <SelectItem key={entry.value} value={String(entry.value)}>
                            {entry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
