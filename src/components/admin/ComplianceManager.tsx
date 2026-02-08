import { useState, useMemo } from 'react';
import { Plus, ClipboardCheck, Trash2, Edit2, Calendar, AlertTriangle, CheckCircle2, Users, Bell, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ComplianceCheck, SafetyCheckItem, ComplianceCategory, CustomBuilding, UserPermission, SAFETY_ROLE_LABELS } from '@/types/admin';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { userCanPerformCheckCategory, getQualifiedRolesDescription } from '@/utils/complianceRoles';

interface ComplianceManagerProps {
  checks: ComplianceCheck[];
  items: SafetyCheckItem[];
  categories: ComplianceCategory[];
  buildings: CustomBuilding[];
  users: UserPermission[];
  onAddCheck: (check: Omit<ComplianceCheck, 'id'>) => ComplianceCheck;
  onUpdateCheck: (id: string, updates: Partial<ComplianceCheck>) => void;
  onDeleteCheck: (id: string) => void;
  onAddItem: (item: Omit<SafetyCheckItem, 'id'>) => SafetyCheckItem;
  onUpdateItem: (id: string, updates: Partial<SafetyCheckItem>) => void;
  onDeleteItem: (id: string) => void;
}

const frequencyLabels = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

const getNextDueDate = (frequency: ComplianceCheck['frequency'], customDays?: number): Date => {
  const now = new Date();
  if (frequency === 'daily' && customDays) {
    return addDays(now, customDays);
  }
  switch (frequency) {
    case 'daily': return addDays(now, 1);
    case 'weekly': return addWeeks(now, 1);
    case 'monthly': return addMonths(now, 1);
    case 'quarterly': return addMonths(now, 3);
    case 'annually': return addYears(now, 1);
    default: return addMonths(now, 1);
  }
};

export function ComplianceManager({ 
  checks, 
  items, 
  categories, 
  buildings,
  users,
  onAddCheck, 
  onUpdateCheck, 
  onDeleteCheck,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: ComplianceManagerProps) {
  const [isAddingCheck, setIsAddingCheck] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [checkFormData, setCheckFormData] = useState({
    name: '',
    description: '',
    frequency: 'monthly' as ComplianceCheck['frequency'],
    buildingIds: [] as string[],
    category: categories[0]?.id || '',
    assignedUsers: [] as string[],
    isRecurring: true,
    customFrequencyDays: undefined as number | undefined,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reminderDaysBefore: 1,
  });
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    category: categories[0]?.id || '',
    required: true,
  });

  const handleAddCheck = () => {
    if (!checkFormData.name.trim()) {
      toast.error('Check name is required');
      return;
    }
    onAddCheck({
      name: checkFormData.name.trim(),
      description: checkFormData.description.trim(),
      frequency: checkFormData.frequency,
      buildingIds: checkFormData.buildingIds,
      nextDue: checkFormData.startDate || getNextDueDate(checkFormData.frequency, checkFormData.customFrequencyDays),
      status: 'pending',
      category: checkFormData.category,
      assignedUsers: checkFormData.assignedUsers,
      isRecurring: checkFormData.isRecurring,
      customFrequencyDays: checkFormData.customFrequencyDays,
      startDate: checkFormData.startDate,
      endDate: checkFormData.endDate,
      reminderDaysBefore: checkFormData.reminderDaysBefore,
    });
    setCheckFormData({ 
      name: '', 
      description: '', 
      frequency: 'monthly', 
      buildingIds: [], 
      category: categories[0]?.id || '',
      assignedUsers: [],
      isRecurring: true,
      customFrequencyDays: undefined,
      startDate: undefined,
      endDate: undefined,
      reminderDaysBefore: 1,
    });
    setIsAddingCheck(false);
    toast.success('Compliance check added successfully');
  };

  const handleAddItem = () => {
    if (!itemFormData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    onAddItem({
      name: itemFormData.name.trim(),
      description: itemFormData.description.trim(),
      category: itemFormData.category,
      required: itemFormData.required,
      order: items.length + 1,
    });
    setItemFormData({ name: '', description: '', category: categories[0]?.id || '', required: true });
    setIsAddingItem(false);
    toast.success('Safety check item added successfully');
  };

  const markCheckComplete = (checkId: string) => {
    const check = checks.find(c => c.id === checkId);
    if (!check) return;
    onUpdateCheck(checkId, {
      status: 'completed',
      lastCompleted: new Date(),
      nextDue: check.isRecurring ? getNextDueDate(check.frequency, check.customFrequencyDays) : check.nextDue,
    });
    toast.success('Check marked as complete');
  };

  const toggleBuildingForCheck = (buildingId: string) => {
    setCheckFormData(prev => ({
      ...prev,
      buildingIds: prev.buildingIds.includes(buildingId)
        ? prev.buildingIds.filter(id => id !== buildingId)
        : [...prev.buildingIds, buildingId],
    }));
  };

  const toggleUserForCheck = (userId: string) => {
    setCheckFormData(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.userName || 'Unknown User';
  };

  const getStatusBadge = (status: ComplianceCheck['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-safe-muted text-safe"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'overdue':
        return <Badge className="bg-emergency-muted text-emergency"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'pending':
        return <Badge className="bg-warning-muted text-warning"><Calendar className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">N/A</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Compliance Checks</TabsTrigger>
          <TabsTrigger value="items">Safety Check Items</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Compliance Checks
                </CardTitle>
                <CardDescription>
                  Scheduled safety and compliance checks
                </CardDescription>
              </div>
              <Dialog open={isAddingCheck} onOpenChange={setIsAddingCheck}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Check
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Schedule Recurring Compliance Check</DialogTitle>
                    <DialogDescription>
                      Create a new scheduled compliance check with custom frequency and user assignments.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Check Name *</Label>
                      <Input
                        placeholder="e.g., Monthly Fire Extinguisher Inspection"
                        value={checkFormData.name}
                        onChange={(e) => setCheckFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe what this check involves..."
                        value={checkFormData.description}
                        onChange={(e) => setCheckFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    {/* Recurring Settings */}
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-muted-foreground" />
                          <Label className="font-medium">Recurring Schedule</Label>
                        </div>
                        <Switch
                          checked={checkFormData.isRecurring}
                          onCheckedChange={(checked) => setCheckFormData(prev => ({ ...prev, isRecurring: checked }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={checkFormData.frequency} onValueChange={(value: ComplianceCheck['frequency']) => setCheckFormData(prev => ({ ...prev, frequency: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(frequencyLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={checkFormData.category} onValueChange={(value) => setCheckFormData(prev => ({ ...prev, category: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {checkFormData.frequency === 'daily' && (
                        <div className="space-y-2">
                          <Label>Custom Interval (Days)</Label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g., 3 for every 3 days"
                            value={checkFormData.customFrequencyDays || ''}
                            onChange={(e) => setCheckFormData(prev => ({ 
                              ...prev, 
                              customFrequencyDays: e.target.value ? parseInt(e.target.value) : undefined 
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">Leave empty for daily checks</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !checkFormData.startDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {checkFormData.startDate ? format(checkFormData.startDate, "PPP") : "Pick start date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={checkFormData.startDate}
                                onSelect={(date) => setCheckFormData(prev => ({ ...prev, startDate: date }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>End Date (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !checkFormData.endDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {checkFormData.endDate ? format(checkFormData.endDate, "PPP") : "No end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={checkFormData.endDate}
                                onSelect={(date) => setCheckFormData(prev => ({ ...prev, endDate: date }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          Reminder (Days Before Due)
                        </Label>
                        <Select 
                          value={String(checkFormData.reminderDaysBefore)} 
                          onValueChange={(value) => setCheckFormData(prev => ({ ...prev, reminderDaysBefore: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No reminder</SelectItem>
                            <SelectItem value="1">1 day before</SelectItem>
                            <SelectItem value="2">2 days before</SelectItem>
                            <SelectItem value="3">3 days before</SelectItem>
                            <SelectItem value="7">1 week before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Assigned Users - Filtered by safety role qualification */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assign Users
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-xs">
                                Only users with relevant safety roles can be assigned. 
                                For this category: {getQualifiedRolesDescription(checkFormData.category)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      
                      {/* Info about qualified roles */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                        <Info className="w-3 h-3 shrink-0" />
                        <span>Qualified roles: {getQualifiedRolesDescription(checkFormData.category)}</span>
                      </div>
                      
                      <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                        {(() => {
                          // Filter users who have qualifying safety roles for this category
                          const qualifiedUsers = users.filter(user => 
                            userCanPerformCheckCategory(user.safetyRoles, checkFormData.category)
                          );
                          const unqualifiedUsers = users.filter(user => 
                            !userCanPerformCheckCategory(user.safetyRoles, checkFormData.category)
                          );
                          
                          if (qualifiedUsers.length === 0 && unqualifiedUsers.length === 0) {
                            return (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No users available. Add users in the Permissions tab first.
                              </p>
                            );
                          }
                          
                          if (qualifiedUsers.length === 0) {
                            return (
                              <p className="text-sm text-warning text-center py-2">
                                No users have the required safety roles for this category.
                                Assign {getQualifiedRolesDescription(checkFormData.category)} roles to users first.
                              </p>
                            );
                          }
                          
                          return (
                            <>
                              {qualifiedUsers.map((user) => (
                                <div key={user.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={checkFormData.assignedUsers.includes(user.id)}
                                    onCheckedChange={() => toggleUserForCheck(user.id)}
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
                              ))}
                              
                              {/* Show unqualified users as disabled for transparency */}
                              {unqualifiedUsers.length > 0 && (
                                <>
                                  <div className="border-t my-2 pt-2">
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Not qualified for this check type:
                                    </p>
                                  </div>
                                  {unqualifiedUsers.slice(0, 3).map((user) => (
                                    <div key={user.id} className="flex items-center space-x-2 opacity-50">
                                      <Checkbox disabled checked={false} />
                                      <label className="text-sm text-muted-foreground flex-1">
                                        {user.userName}
                                      </label>
                                      {user.safetyRoles.length > 0 ? (
                                        <Badge variant="outline" className="text-xs">
                                          {SAFETY_ROLE_LABELS[user.safetyRoles[0]]}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">No safety role</Badge>
                                      )}
                                    </div>
                                  ))}
                                  {unqualifiedUsers.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{unqualifiedUsers.length - 3} more users without required roles
                                    </p>
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {checkFormData.assignedUsers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {checkFormData.assignedUsers.length} user(s) selected
                        </p>
                      )}
                    </div>

                    {/* Buildings */}
                    <div className="space-y-2">
                      <Label>Applicable Buildings</Label>
                      <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                        {buildings.map((building) => (
                          <div key={building.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={checkFormData.buildingIds.includes(building.id)}
                              onCheckedChange={() => toggleBuildingForCheck(building.id)}
                            />
                            <label className="text-sm cursor-pointer">{building.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingCheck(false)}>Cancel</Button>
                    <Button onClick={handleAddCheck}>Schedule Check</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No compliance checks configured yet.</p>
                  <p className="text-sm">Click "Add Check" to create scheduled checks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                    {checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg bg-background">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{check.name}</h4>
                          {getStatusBadge(check.status)}
                          {check.isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{check.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>Frequency: {frequencyLabels[check.frequency]}{check.customFrequencyDays ? ` (every ${check.customFrequencyDays} days)` : ''}</span>
                          <span>Next Due: {format(new Date(check.nextDue), 'MMM d, yyyy')}</span>
                          {check.lastCompleted && (
                            <span>Last Completed: {format(new Date(check.lastCompleted), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                        {check.assignedUsers && check.assignedUsers.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {check.assignedUsers.slice(0, 3).map(userId => (
                                <Badge key={userId} variant="secondary" className="text-xs">
                                  {getUserName(userId)}
                                </Badge>
                              ))}
                              {check.assignedUsers.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{check.assignedUsers.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => markCheckComplete(check.id)}
                          disabled={check.status === 'completed'}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Check?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this compliance check.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteCheck(check.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Safety Check Items
                </CardTitle>
                <CardDescription>
                  Individual safety check items and requirements
                </CardDescription>
              </div>
              <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Safety Check Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input
                        placeholder="e.g., Fire Extinguisher Check"
                        value={itemFormData.name}
                        onChange={(e) => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe this check item..."
                        value={itemFormData.description}
                        onChange={(e) => setItemFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={itemFormData.category} onValueChange={(value) => setItemFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={itemFormData.required}
                        onCheckedChange={(checked) => setItemFormData(prev => ({ ...prev, required: checked }))}
                      />
                      <Label>Required</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancel</Button>
                    <Button onClick={handleAddItem}>Add Item</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No safety check items configured yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const category = categories.find(c => c.id === item.category);
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color || 'gray' }} />
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.required && <Badge variant="secondary">Required</Badge>}
                          <Badge variant="outline">{category?.name}</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this safety check item.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteItem(item.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
