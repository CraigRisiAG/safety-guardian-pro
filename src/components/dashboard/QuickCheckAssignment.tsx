import { useState, useMemo, useEffect } from 'react';
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

const TRAINING_CERTIFICATE_OPTIONS = [
  { value: 'first_aid', label: 'First Aid' },
  { value: 'evacuation', label: 'Evacuation' },
  { value: 'health_safety_officer', label: 'H&S Officer' },
  { value: 'fire_marshall', label: 'Fire Marshall' },
  { value: 'evac_chair', label: 'Evac Chair' },
] as const;

const TRAINING_LEVEL_OPTIONS = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
] as const;

interface QuickCheckAssignmentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  onCheckCreated?: (check: ComplianceCheck) => void;
  assignmentMode?: 'check' | 'training';
}

export function QuickCheckAssignment({ 
  open, 
  onOpenChange, 
  initialDate,
  onCheckCreated,
  assignmentMode = 'check',
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
  const isTrainingMode = assignmentMode === 'training';

  const availableCategories = useMemo(
    () => settings.complianceCategories.filter((cat) => isTrainingMode ? cat.id === 'training' : cat.id !== 'training'),
    [settings.complianceCategories, isTrainingMode],
  );

  const defaultCategory = useMemo(() => {
    return availableCategories[0]?.id || '';
  }, [availableCategories]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: defaultCategory,
    dueDate: initialDate || new Date(),
    buildingIds: [] as string[],
    floorIds: [] as string[],
    areaIds: [] as string[],
    assignedUsers: [] as string[],
    assignToSelf: !isAdmin, // Non-admins assign to self by default
    recurrencePattern: 'none' as NonNullable<ComplianceCheck['recurrencePattern']>,
    recurrenceWeekOfMonth: 1 as 1 | 2 | 3 | 4 | 'last',
    recurrenceWeekday: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    trainingParticipantId: '',
    trainingCertificateType: TRAINING_CERTIFICATE_OPTIONS[0].value,
    trainingLevel: TRAINING_LEVEL_OPTIONS[0].value,
  });

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData({
        name: '',
        description: '',
        category: defaultCategory,
        dueDate: initialDate || new Date(),
        buildingIds: [],
        floorIds: [],
        areaIds: [],
        assignedUsers: [],
        assignToSelf: !isAdmin,
        recurrencePattern: 'none',
        recurrenceWeekOfMonth: 1,
        recurrenceWeekday: 1,
        trainingParticipantId: currentUserPermission?.id || '',
        trainingCertificateType: TRAINING_CERTIFICATE_OPTIONS[0].value,
        trainingLevel: TRAINING_LEVEL_OPTIONS[0].value,
      });
    }
    onOpenChange(newOpen);
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category: defaultCategory,
      assignedUsers: [],
      assignToSelf:
        !isAdmin && userCanPerformCheckCategory(currentUserPermission?.safetyRoles || [], defaultCategory),
    }));
  }, [defaultCategory, isAdmin, currentUserPermission?.safetyRoles]);

  // Get qualified users for selected category
  const qualifiedUsers = useMemo(() => {
    return settings.userPermissions.filter(user => 
      userCanPerformCheckCategory(user.safetyRoles, formData.category)
    );
  }, [settings.userPermissions, formData.category]);

  const trainingParticipants = useMemo(() => {
    if (isAdmin) {
      return settings.userPermissions;
    }
    return currentUserPermission ? [currentUserPermission] : [];
  }, [isAdmin, settings.userPermissions, currentUserPermission]);

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
    if (!isTrainingMode && !formData.name.trim()) {
      toast.error('Check name is required');
      return;
    }

    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    if (isTrainingMode && !formData.trainingParticipantId) {
      toast.error('Please select the person who is going on training');
      return;
    }

    // Determine assigned users
    let assignedUserIds = formData.assignedUsers;
    if (isTrainingMode) {
      assignedUserIds = [formData.trainingParticipantId];
    } else if (formData.assignToSelf && currentUserPermission) {
      assignedUserIds = [currentUserPermission.id];
    }

    if (assignedUserIds.length === 0) {
      toast.error(isTrainingMode ? 'Please select a trainee' : 'Please assign at least one user');
      return;
    }

    const selectedTrainingParticipant = settings.userPermissions.find(
      (entry) => entry.id === formData.trainingParticipantId,
    );
    const selectedTrainingCertificate = TRAINING_CERTIFICATE_OPTIONS.find(
      (entry) => entry.value === formData.trainingCertificateType,
    )?.label;

    const trainingName = selectedTrainingParticipant
      ? `Training: ${selectedTrainingParticipant.userName} - ${selectedTrainingCertificate} (Level ${formData.trainingLevel})`
      : `Training - ${selectedTrainingCertificate} (Level ${formData.trainingLevel})`;

    const newCheck = addComplianceCheck({
      name: isTrainingMode ? trainingName : formData.name.trim(),
      description: isTrainingMode
        ? `Certificate: ${selectedTrainingCertificate} | Level: ${formData.trainingLevel}`
        : formData.description.trim(),
      frequency: 'monthly', // Default, can be modified in full admin panel
      buildingIds: isTrainingMode ? [] : formData.buildingIds,
      floorIds: isTrainingMode ? [] : formData.floorIds,
      areaIds: isTrainingMode ? [] : formData.areaIds,
      nextDue: formData.dueDate,
      status: 'pending',
      category: formData.category,
      assignedUsers: assignedUserIds,
      isRecurring: isTrainingMode ? false : formData.recurrencePattern !== 'none',
      recurrencePattern: isTrainingMode ? 'none' : formData.recurrencePattern,
      recurrenceWeekOfMonth:
        !isTrainingMode && formData.recurrencePattern === 'monthly_week_of_month'
          ? formData.recurrenceWeekOfMonth
          : undefined,
      recurrenceWeekday:
        !isTrainingMode && formData.recurrencePattern === 'monthly_week_of_month'
          ? formData.recurrenceWeekday
          : undefined,
      startDate: !isTrainingMode && formData.recurrencePattern !== 'none' ? formData.dueDate : undefined,
      reminderDaysBefore: 1,
    });

    toast.success(isTrainingMode ? 'Training assigned successfully' : 'Compliance check assigned successfully');
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
            {isTrainingMode ? 'Assign Training' : 'Assign Compliance Check'}
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? `Create and assign a new ${isTrainingMode ? 'training' : 'compliance check'} to qualified users.`
              : `Assign a ${isTrainingMode ? 'training item' : 'compliance check'} to yourself.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isTrainingMode && (
            <>
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
            </>
          )}

          {isTrainingMode && (
            <div className="space-y-4 border rounded-lg p-3 bg-muted/20">
              <div className="space-y-2">
                <Label>Person Going On Training *</Label>
                <Select
                  value={formData.trainingParticipantId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, trainingParticipantId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trainingParticipants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.userName} ({participant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Certificate *</Label>
                  <Select
                    value={formData.trainingCertificateType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, trainingCertificateType: value as typeof TRAINING_CERTIFICATE_OPTIONS[number]['value'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_CERTIFICATE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Training Level *</Label>
                  <Select
                    value={formData.trainingLevel}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, trainingLevel: value as typeof TRAINING_LEVEL_OPTIONS[number]['value'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {!isTrainingMode && (
            <>
              {/* Category & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: value,
                        assignedUsers: [],
                        assignToSelf:
                          !isAdmin &&
                          userCanPerformCheckCategory(currentUserPermission?.safetyRoles || [], value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
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
                          'w-full justify-start text-left font-normal',
                          !formData.dueDate && 'text-muted-foreground',
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {formData.dueDate ? format(formData.dueDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => date && setFormData((prev) => ({ ...prev, dueDate: date }))}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
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
                    <p className="text-sm text-muted-foreground text-center py-2">No buildings configured.</p>
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
                    <p className="text-sm text-muted-foreground text-center py-2">Select one or more buildings first.</p>
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
                    <p className="text-sm text-muted-foreground text-center py-2">Select one or more floors to target specific areas.</p>
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
                                value === 'last' ? 'last' : (parseInt(value, 10) as 1 | 2 | 3 | 4),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getMonthlyWeekLabels().map((entry) => (
                              <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
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
                              <SelectItem key={entry.value} value={String(entry.value)}>{entry.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Assignment Section */}
          {!isTrainingMode && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="w-4 h-4 mr-2" />
            {isTrainingMode ? 'Assign Training' : 'Assign Check'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
