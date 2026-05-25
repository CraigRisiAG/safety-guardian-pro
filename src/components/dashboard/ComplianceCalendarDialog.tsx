import { useState, useMemo, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Clock, CalendarCheck, Play, Plus, User, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompletedCheckRecord, CHECK_TYPE_LABELS } from '@/types/compliance';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useCertificates } from '@/hooks/useCertificates';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import { ComplianceCheck, UserPermission } from '@/types/admin';
import { QuickCheckAssignment } from './QuickCheckAssignment';
import { resolveCheckAssignedUsers } from '@/utils/complianceAssignments';
import { loadMissedComplianceRecords } from '@/lib/complianceMonitoring';
import { getNextComplianceDueDate } from '@/utils/complianceRecurrence';
import {
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  isToday,
  parseISO
} from 'date-fns';

const STORAGE_KEY = 'safeguard_completed_checks';

type StoredCompletedCheckRecord = Omit<CompletedCheckRecord, 'completedAt'> & {
  completedAt: string | Date;
  followUpDate?: string | Date;
};

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'scheduled' | 'completed' | 'recertification' | 'missed';
  status: 'pass' | 'fail' | 'partial' | 'not_done' | 'cancelled' | 'pending' | 'overdue' | 'recert_due' | 'recert_overdue' | 'incomplete';
  checkType?: string;
  building?: string;
  locationDetails?: string;
  completedByName?: string; // Who completed the check
  checkData?: ComplianceCheck;
}

const STATUS_COLORS: Record<string, string> = {
  pass: 'bg-safe text-safe-foreground',
  fail: 'bg-emergency text-white',
  partial: 'bg-warning text-warning-foreground',
  not_done: 'bg-warning text-warning-foreground',
  cancelled: 'bg-muted text-muted-foreground',
  pending: 'bg-info text-info-foreground',
  overdue: 'bg-emergency/80 text-white',
  incomplete: 'bg-emergency text-white',
  recert_due: 'bg-warning text-warning-foreground',
  recert_overdue: 'bg-emergency/80 text-white',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pass: 'bg-safe',
  fail: 'bg-emergency',
  partial: 'bg-warning',
  not_done: 'bg-warning',
  cancelled: 'bg-muted-foreground',
  pending: 'bg-info',
  overdue: 'bg-emergency',
  incomplete: 'bg-emergency',
  recert_due: 'bg-warning',
  recert_overdue: 'bg-emergency',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="w-3 h-3" />,
  fail: <XCircle className="w-3 h-3" />,
  partial: <AlertTriangle className="w-3 h-3" />,
  not_done: <AlertTriangle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  overdue: <AlertTriangle className="w-3 h-3" />,
  incomplete: <XCircle className="w-3 h-3" />,
  recert_due: <Award className="w-3 h-3" />,
  recert_overdue: <Award className="w-3 h-3" />,
};

interface ComplianceCalendarDialogProps {
  onStartCheck?: (check: ComplianceCheck, onBehalfOf?: UserPermission) => void;
}

export function ComplianceCalendarDialog({ onStartCheck }: ComplianceCalendarDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignDialogMode, setAssignDialogMode] = useState<'check' | 'training'>('check');
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const { certificates } = useCertificates();

  // Determine if current user is admin/super_admin
  const currentUserPermission = useMemo(() => {
    if (!user) return null;
    return settings.userPermissions.find(
      p => p.email.toLowerCase() === user.email.toLowerCase() || p.userId === user.id
    );
  }, [user, settings.userPermissions]);

  const isAdmin = currentUserPermission?.role === 'admin' || currentUserPermission?.role === 'super_admin';

  // Load completed checks from localStorage
  const completedChecks = useMemo((): CompletedCheckRecord[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return (parsed as StoredCompletedCheckRecord[]).map((record) => ({
        ...record,
        completedAt: typeof record.completedAt === 'string' 
          ? parseISO(record.completedAt) 
          : new Date(record.completedAt),
        followUpDate:
          typeof record.followUpDate === 'string'
            ? parseISO(record.followUpDate)
            : record.followUpDate
              ? new Date(record.followUpDate)
              : undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  // Get building name helper
  const getBuildingName = useCallback((buildingId: string): string => {
    const building = settings.buildings.find(b => b.id === buildingId);
    return building?.name || 'Unknown Building';
  }, [settings.buildings]);

  const getLocationDetails = useCallback((check: ComplianceCheck): string | undefined => {
    const floorNames = settings.buildings
      .flatMap((building) => building.floors)
      .filter((floor) => (check.floorIds || []).includes(floor.id))
      .map((floor) => floor.name);

    const areaNames = settings.buildings
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.areas)
      .filter((area) => (check.areaIds || []).includes(area.id))
      .map((area) => area.name);

    const parts: string[] = [];
    if (floorNames.length > 0) {
      parts.push(`Floors: ${floorNames.join(', ')}`);
    }
    if (areaNames.length > 0) {
      parts.push(`Areas: ${areaNames.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : undefined;
  }, [settings.buildings]);

  // Create calendar events from scheduled and completed checks
  // Filter based on user role - admins see all, users see only assigned
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const now = new Date();

    // Filter scheduled checks based on user permissions
    const visibleChecks = settings.complianceChecks.filter(check => {
      // Admins and super_admins see all checks
      if (isAdmin) return true;
      
      // Regular users only see their assigned checks
      if (!currentUserPermission) return false;
      return resolveCheckAssignedUsers(check, settings.userPermissions, settings.buildings).some(
        (entry) =>
          entry.id === currentUserPermission.id ||
          entry.userId === currentUserPermission.userId,
      );
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Add scheduled checks
    visibleChecks.forEach(check => {
      // Completed checks should appear only via completed history events, not as scheduled assignments.
      if (check.status === 'completed') {
        return;
      }

      const isMonthlyRecurring = check.isRecurring && check.frequency === 'monthly' && check.recurrencePattern !== 'none';
      const locationDetails = getLocationDetails(check);

      if (isMonthlyRecurring) {
        const startBoundary = check.startDate ? new Date(check.startDate) : new Date(check.nextDue);
        let occurrenceDate = new Date(startBoundary);
        let loopGuard = 0;

        while (isBefore(occurrenceDate, monthStart) && loopGuard < 600) {
          occurrenceDate = getNextComplianceDueDate(check, occurrenceDate);
          loopGuard += 1;
        }

        while (!isBefore(monthEnd, occurrenceDate) && loopGuard < 700) {
          const beforeStart = check.startDate && occurrenceDate < new Date(check.startDate);
          const afterEnd = check.endDate && occurrenceDate > new Date(check.endDate);

          if (!beforeStart && !afterEnd) {
            const isOverdue = isBefore(occurrenceDate, now) && check.status !== 'completed';
            events.push({
              id: `scheduled-${check.id}-${format(occurrenceDate, 'yyyy-MM-dd')}`,
              title: check.name,
              date: occurrenceDate,
              type: 'scheduled',
              status: isOverdue ? 'overdue' : 'pending',
              checkType: check.category,
              building: check.buildingIds.map(id => getBuildingName(id)).join(', '),
              locationDetails,
              checkData: check,
            });
          }

          const nextOccurrence = getNextComplianceDueDate(check, occurrenceDate);
          if (nextOccurrence.getTime() === occurrenceDate.getTime()) {
            break;
          }
          occurrenceDate = nextOccurrence;
          loopGuard += 1;
        }

        return;
      }

      const dueDate = new Date(check.nextDue);
      const isOverdue = isBefore(dueDate, now) && check.status !== 'completed';

      events.push({
        id: `scheduled-${check.id}`,
        title: check.name,
        date: dueDate,
        type: 'scheduled',
        status: isOverdue ? 'overdue' : 'pending',
        checkType: check.category,
        building: check.buildingIds.map(id => getBuildingName(id)).join(', '),
        locationDetails,
        checkData: check,
      });
    });

    // Add completed checks (all users can see their own completed checks)
    const visibleCompletedChecks = completedChecks.filter(record => {
      if (isAdmin) return true;
      if (!currentUserPermission) return false;
      return record.completedBy.userId === currentUserPermission.id || 
             record.completedBy.userId === currentUserPermission.userId;
    });

    visibleCompletedChecks.forEach(record => {
      events.push({
        id: `completed-${record.id}`,
        title: CHECK_TYPE_LABELS[record.checkType],
        date: record.completedAt,
        type: 'completed',
        status: record.status,
        checkType: record.checkType,
        building: getBuildingName(record.buildingId),
        completedByName: record.completedBy.userName,
      });
    });

    const missedRecords = loadMissedComplianceRecords().filter((entry) => entry.status === 'incomplete');
    const visibleMissedRecords = missedRecords.filter((record) => {
      if (isAdmin) return true;
      if (!currentUserPermission) return false;
      return (
        record.assignedUserIds.includes(currentUserPermission.id) ||
        record.assignedUserIds.includes(currentUserPermission.userId)
      );
    });

    visibleMissedRecords.forEach((record) => {
      events.push({
        id: `missed-${record.id}`,
        title: record.checkName,
        date: record.dueAt,
        type: 'missed',
        status: 'incomplete',
        checkType: record.category,
      });
    });

    // Add certificate recertification events
    const visibleCerts = certificates.filter(cert => {
      if (isAdmin) return true;
      if (!currentUserPermission) return false;
      return cert.userId === currentUserPermission.id || cert.userId === currentUserPermission.userId;
    });

    visibleCerts.forEach(cert => {
      const isOverdue = isBefore(cert.expiryDate, now);
      events.push({
        id: `recert-${cert.id}`,
        title: `Recertification: ${cert.userName}`,
        date: cert.expiryDate,
        type: 'recertification',
        status: isOverdue ? 'recert_overdue' : 'recert_due',
        checkType: CERTIFICATE_TYPE_LABELS[cert.certificateType],
      });
    });

    return events;
  }, [settings.complianceChecks, settings.userPermissions, settings.buildings, completedChecks, isAdmin, currentUserPermission, currentMonth, certificates, getBuildingName, getLocationDetails]);

  // Get days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return calendarEvents.filter(event => isSameDay(event.date, day));
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Handle starting a check from calendar
  // Handle assigning a new check from calendar
  const handleAssignCheck = () => {
    setAssignDialogMode('check');
    setShowAssignDialog(true);
  };

  const handleAssignTraining = () => {
    setAssignDialogMode('training');
    setShowAssignDialog(true);
  };

  const handleStartCheck = (event: CalendarEvent) => {
    if (event.checkData && onStartCheck) {
      onStartCheck(event.checkData);
      setIsOpen(false);
    }
  };

  // Stats for the legend
  const stats = useMemo(() => {
    const monthEvents = calendarEvents.filter(e => isSameMonth(e.date, currentMonth));
    return {
      completed: monthEvents.filter(e => e.type === 'completed').length,
      scheduled: monthEvents.filter(e => e.type === 'scheduled' && e.status === 'pending').length,
      overdue: monthEvents.filter(e => e.status === 'overdue' || e.status === 'recert_overdue').length,
      incomplete: monthEvents.filter(e => e.status === 'incomplete').length,
      passed: monthEvents.filter(e => e.status === 'pass').length,
      failed: monthEvents.filter(e => e.status === 'fail').length,
      recertifications: monthEvents.filter(e => e.type === 'recertification').length,
    };
  }, [calendarEvents, currentMonth]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-accent hover:bg-accent/80 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-primary/20">
          <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <span className="font-medium text-foreground text-sm sm:text-base text-center">Compliance Calendar</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Compliance Calendar
          </DialogTitle>
          <DialogDescription>
            {isAdmin 
              ? 'View all scheduled and completed compliance checks. Click on pending checks to start them or complete on behalf of others.'
              : 'View your assigned compliance checks. Click on pending checks to start them.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar Grid */}
          <div className="flex-1">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                  Today
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleAssignCheck}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign Check
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAssignTraining}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign Training
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                
                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedDate(day)}
                          className={`
                            min-h-[60px] p-1 rounded-lg border transition-colors text-left
                            ${isCurrentMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground'}
                            ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'}
                            ${isTodayDate ? 'bg-primary/10' : ''}
                          `}
                        >
                          <div className={`text-xs font-medium mb-1 ${isTodayDate ? 'text-primary font-bold' : ''}`}>
                            {format(day, 'd')}
                          </div>
                          
                          {dayEvents.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {dayEvents.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[event.status]}`}
                                />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {dayEvents.length > 0 && (
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            {dayEvents.map(event => (
                              <div key={event.id} className="flex items-center gap-1.5 text-xs">
                                <div className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[event.status]}`} />
                                <span className="truncate">{event.title}</span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-safe" />
                <span>Passed ({stats.passed})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emergency" />
                <span>Failed ({stats.failed})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-info" />
                <span>Scheduled ({stats.scheduled})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emergency/80" />
                <span>Overdue ({stats.overdue})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emergency" />
                <span>Missed ({stats.incomplete})</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details */}
          <div className="lg:w-72 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">
                {selectedDate 
                  ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                  : 'Select a day to view details'
                }
              </h4>
              {selectedDate && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAssignCheck}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign Check
                </Button>
              )}
            </div>
            
            {selectedDate && (
              <ScrollArea className="h-[280px] lg:h-[400px]">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No compliance events on this day
                  </div>
                ) : (
                  <div className="space-y-3 pr-3">
                    {selectedDateEvents.map(event => (
                      <div 
                        key={event.id} 
                        className={`
                          p-3 rounded-lg border bg-card transition-colors
                          ${event.type === 'scheduled' && event.checkData 
                            ? 'hover:bg-accent/50 cursor-pointer hover:border-primary/30' 
                            : ''
                          }
                        `}
                        onClick={() => event.type === 'scheduled' && handleStartCheck(event)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-sm">{event.title}</span>
                          <Badge 
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[event.status]}`}
                          >
                            <span className="flex items-center gap-1">
                              {STATUS_ICONS[event.status]}
                              {event.status}
                            </span>
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CalendarCheck className="w-3 h-3" />
                            <span>
                              {event.type === 'completed'
                                ? 'Completed'
                                : event.type === 'recertification'
                                  ? 'Recertification due'
                                  : event.type === 'missed'
                                    ? 'Missed and logged incomplete'
                                    : 'Scheduled'}
                              {event.type !== 'recertification' && ` at ${format(event.date, 'h:mm a')}`}
                              {event.type === 'recertification' && ` ${format(event.date, 'dd MMM yyyy')}`}
                            </span>
                          </div>
                          {event.completedByName && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <User className="w-3 h-3" />
                              <span>By: {event.completedByName}</span>
                            </div>
                          )}
                          {event.building && (
                            <div className="text-xs">
                              📍 {event.building}
                            </div>
                          )}
                          {event.locationDetails && (
                            <div className="text-xs">
                              {event.locationDetails}
                            </div>
                          )}
                          {event.checkType && (
                            <div className="text-xs capitalize">
                              Type: {event.checkType.replace('-', ' ')}
                            </div>
                          )}
                        </div>

                        {/* Start Check Button for scheduled checks */}
                        {event.type === 'scheduled' && event.checkData && onStartCheck && (
                          <Button 
                            size="sm" 
                            variant={event.status === 'overdue' ? 'destructive' : 'default'}
                            className="w-full mt-2"
                            onClick={(e) => { e.stopPropagation(); handleStartCheck(event); }}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start Check
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Quick Check Assignment Dialog */}
        <QuickCheckAssignment
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          initialDate={selectedDate || new Date()}
          assignmentMode={assignDialogMode}
        />
      </DialogContent>
    </Dialog>
  );
}
