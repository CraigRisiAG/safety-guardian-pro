import { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Clock, AlertTriangle, CheckCircle2, User, Users, Calendar, Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { ComplianceCheck, SAFETY_ROLE_LABELS, UserPermission } from '@/types/admin';
import { format, isBefore, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { resolveCheckAssignedUsers } from '@/utils/complianceAssignments';
import { loadMissedComplianceRecords } from '@/lib/complianceMonitoring';

interface PendingChecksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilter?: 'this_week' | 'overdue' | 'all';
  categoryFilter?: 'all' | 'non_training' | 'training';
  onStartCheck: (check: ComplianceCheck, onBehalfOf?: UserPermission) => void;
}

export function PendingChecksDialog({ 
  open, 
  onOpenChange, 
  initialFilter = 'all',
  categoryFilter = 'all',
  onStartCheck 
}: PendingChecksDialogProps) {
  const { user } = useAuth();
  const { settings } = useAdminSettings();
  const [filter, setFilter] = useState<'this_week' | 'overdue' | 'all'>(initialFilter);
  const [selectedUserId, setSelectedUserId] = useState<string>('current');

  // Determine if current user is admin/super_admin
  const currentUserPermission = useMemo(() => {
    if (!user) return null;
    return settings.userPermissions.find(
      p => p.email.toLowerCase() === user.email.toLowerCase() || p.userId === user.id
    );
  }, [user, settings.userPermissions]);

  const isAdmin = currentUserPermission?.role === 'admin' || currentUserPermission?.role === 'super_admin';
  const isSuperAdmin = currentUserPermission?.role === 'super_admin';

  useEffect(() => {
    if (open) {
      setFilter(initialFilter);
      setSelectedUserId(isSuperAdmin ? 'all' : 'current');
    }
  }, [open, initialFilter, isSuperAdmin]);

  // Get checks assigned to the current user (or all for admins)
  const pendingChecks = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return settings.complianceChecks
      .filter(check => check.status !== 'completed')
      .filter(check => {
        if (categoryFilter === 'training') {
          return check.category === 'training';
        }

        if (categoryFilter === 'non_training') {
          return check.category !== 'training';
        }

        return true;
      })
      .filter(check => {
        const assignedUsers = resolveCheckAssignedUsers(check, settings.userPermissions, settings.buildings);

        // Filter by assignment
        if (isSuperAdmin && selectedUserId !== 'current') {
          if (selectedUserId === 'all') return true;
          return assignedUsers.some((entry) => entry.id === selectedUserId || entry.userId === selectedUserId);
        }
        
        // For non-super-admin users, only show checks assigned to them
        if (!currentUserPermission) return false;
        return assignedUsers.some((entry) =>
                 entry.id === currentUserPermission.id ||
                 entry.userId === currentUserPermission.userId,
               );
      })
      .filter(check => {
        const dueDate = new Date(check.nextDue);
        const isOverdue = isBefore(dueDate, now);
        const isThisWeek = isWithinInterval(dueDate, { start: weekStart, end: weekEnd });
        
        switch (filter) {
          case 'overdue':
            return isOverdue;
          case 'this_week':
            return isThisWeek || isOverdue;
          default:
            return true;
        }
      })
      .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());
  }, [settings.complianceChecks, settings.userPermissions, settings.buildings, currentUserPermission, isSuperAdmin, filter, selectedUserId, categoryFilter]);

  const missedRecords = useMemo(() => {
    const allMissed = loadMissedComplianceRecords().filter((entry) => entry.status === 'incomplete');

    return allMissed.filter((record) => {
      if (isSuperAdmin && selectedUserId !== 'current') {
        if (selectedUserId === 'all') {
          return true;
        }
        return record.assignedUserIds.includes(selectedUserId);
      }

      if (!currentUserPermission) {
        return false;
      }

      return (
        record.assignedUserIds.includes(currentUserPermission.id) ||
        record.assignedUserIds.includes(currentUserPermission.userId)
      );
    }).filter((record) => {
      if (categoryFilter === 'all') {
        return true;
      }

      const linkedCheck = settings.complianceChecks.find((check) => check.id === record.checkId);
      if (!linkedCheck) {
        return categoryFilter !== 'training';
      }

      if (categoryFilter === 'training') {
        return linkedCheck.category === 'training';
      }

      return linkedCheck.category !== 'training';
    });
  }, [isSuperAdmin, selectedUserId, currentUserPermission, categoryFilter, settings.complianceChecks]);

  // Group checks by status
  const { overdueChecks, upcomingChecks } = useMemo(() => {
    const now = new Date();
    return {
      overdueChecks: pendingChecks.filter(c => isBefore(new Date(c.nextDue), now)),
      upcomingChecks: pendingChecks.filter(c => !isBefore(new Date(c.nextDue), now)),
    };
  }, [pendingChecks]);

  // Get building names helper
  const getBuildingNames = (buildingIds: string[]) => {
    return buildingIds
      .map(id => settings.buildings.find(b => b.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'All Buildings';
  };

  // Get assigned user names
  const getAssignedUserNames = (check: ComplianceCheck) => {
    const users = check.assignedUsers || [];
    if (check.assignedTo && !users.includes(check.assignedTo)) {
      users.unshift(check.assignedTo);
    }
    const names = users
      .map(id => settings.userPermissions.find(u => u.id === id)?.userName)
      .filter(Boolean)
      .slice(0, 2)
      .join(', ') + (users.length > 2 ? ` +${users.length - 2}` : '');

    if (names) {
      return names;
    }

    if (check.assignedSafetyRoles?.length) {
      return `Roles: ${check.assignedSafetyRoles.map((role) => SAFETY_ROLE_LABELS[role]).join(', ')}`;
    }

    return '';
  };

  // Handle starting a check
  const handleStartCheck = (check: ComplianceCheck) => {
    const onBehalfOf = isSuperAdmin && selectedUserId !== 'current' && selectedUserId !== 'all'
      ? settings.userPermissions.find(u => u.id === selectedUserId)
      : undefined;
    onStartCheck(check, onBehalfOf);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {categoryFilter === 'training' ? 'Pending Training Assignments' : 'Pending Compliance Checks'}
          </DialogTitle>
          <DialogDescription>
            {isSuperAdmin 
              ? categoryFilter === 'training'
                ? 'View and complete pending training items. As a super admin, you can view all users and complete training on their behalf.'
                : 'View and complete pending checks. As a super admin, you can view all users and complete checks on their behalf.'
              : isAdmin
              ? categoryFilter === 'training'
                ? 'View and complete pending training assigned to you.'
                : 'View and complete pending checks assigned to you.'
              : categoryFilter === 'training'
              ? 'View and complete your assigned training items.'
              : 'View and complete your assigned compliance checks.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                {categoryFilter === 'training' ? `All Training (${pendingChecks.length})` : `All Checks (${pendingChecks.length})`}
              </TabsTrigger>
              <TabsTrigger value="this_week" className="text-xs sm:text-sm">
                <Calendar className="w-3 h-3 mr-1 hidden sm:inline" />
                {categoryFilter === 'training' ? 'Training This Week' : 'Checks This Week'}
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs sm:text-sm">
                <AlertTriangle className="w-3 h-3 mr-1 hidden sm:inline" />
                {categoryFilter === 'training' ? 'Overdue Training' : 'Overdue Checks'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {isSuperAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="View as..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">
                  <span className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    My Checks
                  </span>
                </SelectItem>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    All Checks
                  </span>
                </SelectItem>
                {settings.userPermissions.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.userName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Check List */}
        <ScrollArea className="h-[400px] pr-3">
          {pendingChecks.length === 0 && missedRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mb-3 text-safe" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">
                {categoryFilter === 'training'
                  ? 'No pending training items match your filters.'
                  : 'No pending checks match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {missedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-emergency">
                    <AlertTriangle className="w-4 h-4" />
                    Missed And Logged Incomplete ({missedRecords.length})
                  </div>
                  {missedRecords.slice(0, 20).map((record) => {
                    const linkedCheck = settings.complianceChecks.find((check) => check.id === record.checkId);
                    return (
                      <div key={record.id} className="p-3 rounded-lg border bg-emergency-muted/40 border-emergency/30">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{record.checkName}</div>
                            <div className="text-xs text-muted-foreground">
                              Due {format(new Date(record.dueAt), 'MMM d, yyyy')} · Logged {format(new Date(record.loggedAt), 'MMM d, yyyy')}
                            </div>
                            {linkedCheck?.description && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">{linkedCheck.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="destructive">Incomplete</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!linkedCheck}
                              onClick={() => {
                                if (linkedCheck) {
                                  handleStartCheck(linkedCheck);
                                }
                              }}
                            >
                              Start
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Overdue Section */}
              {overdueChecks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-emergency">
                    <AlertTriangle className="w-4 h-4" />
                    {categoryFilter === 'training'
                      ? `Overdue Training (${overdueChecks.length})`
                      : `Overdue Checks (${overdueChecks.length})`}
                  </div>
                  {overdueChecks.map(check => (
                    <CheckCard 
                      key={check.id} 
                      check={check} 
                      isOverdue
                      getBuildingNames={getBuildingNames}
                      getAssignedUserNames={getAssignedUserNames}
                      onStart={() => handleStartCheck(check)}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming Section */}
              {upcomingChecks.length > 0 && (
                <div className="space-y-2">
                  {overdueChecks.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-4">
                      <Clock className="w-4 h-4" />
                      {categoryFilter === 'training'
                        ? `Upcoming Training (${upcomingChecks.length})`
                        : `Upcoming (${upcomingChecks.length})`}
                    </div>
                  )}
                  {upcomingChecks.map(check => (
                    <CheckCard 
                      key={check.id} 
                      check={check}
                      getBuildingNames={getBuildingNames}
                      getAssignedUserNames={getAssignedUserNames}
                      onStart={() => handleStartCheck(check)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface CheckCardProps {
  check: ComplianceCheck;
  isOverdue?: boolean;
  getBuildingNames: (ids: string[]) => string;
  getAssignedUserNames: (check: ComplianceCheck) => string;
  onStart: () => void;
}

function CheckCard({ check, isOverdue, getBuildingNames, getAssignedUserNames, onStart }: CheckCardProps) {
  const assignedNames = getAssignedUserNames(check);
  
  return (
    <div 
      className={`
        group p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md
        ${isOverdue 
          ? 'bg-emergency-muted/50 border-emergency/30 hover:border-emergency/50' 
          : 'bg-card hover:bg-accent/50 border-border hover:border-primary/30'
        }
      `}
      onClick={onStart}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{check.name}</span>
            {check.category === 'training' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Training
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Overdue
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>Due: {format(new Date(check.nextDue), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{getBuildingNames(check.buildingIds)}</span>
            </div>
            {assignedNames && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{assignedNames}</span>
              </div>
            )}
          </div>
        </div>
        
        <Button 
          size="sm" 
          variant={isOverdue ? 'destructive' : 'default'}
          className="shrink-0 opacity-80 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onStart(); }}
        >
          Start
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
