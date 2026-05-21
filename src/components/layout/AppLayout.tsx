import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Siren, 
  ShieldCheck,
  Settings,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { canManageUsersForUser, findCurrentUserPermission, getScopedAreaIds, isSuperAdminPermission } from '@/lib/personnelAccess';
import { INCIDENTS_UPDATED_EVENT, loadIncidentsFromStorage } from '@/lib/incidentsStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
}

const NOTIFICATIONS_SEEN_KEY_PREFIX = 'safeguard_notifications_seen';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { name: 'Drills', href: '/drills', icon: Siren },
  { name: 'Safety Check-In', href: '/check-in', icon: ShieldCheck, requiresDrill: true },
  { name: 'Admin', href: '/admin', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { isCheckInEnabled } = useDrillStatus();
  const { user } = useAuth();
  const { settings } = useAdminSettings();
  const currentPermission = findCurrentUserPermission(user, settings.userPermissions);
  const canManageUsers = canManageUsersForUser(currentPermission);
  const availableNavigation = navigation.filter((item) => item.href !== '/admin' || canManageUsers);
  
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg gradient-safe">
          <ShieldCheck className="w-6 h-6 text-safe-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">SafeGuard</h1>
          <p className="text-xs text-sidebar-foreground/60">Health & Safety</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <TooltipProvider>
          {availableNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            const isDisabled = item.requiresDrill && !isCheckInEnabled;
            
            if (isDisabled) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/30 cursor-not-allowed"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>No active drill in progress</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [incidents, setIncidents] = useState(() => loadIncidentsFromStorage());
  const [seenSignature, setSeenSignature] = useState('');
  const { user, isImpersonating } = useAuth();
  const { settings } = useAdminSettings();
  const { activeDrill } = useDrillStatus();

  const currentPermission = useMemo(
    () => findCurrentUserPermission(user, settings.userPermissions),
    [settings.userPermissions, user],
  );
  const isSuperAdmin = isSuperAdminPermission(currentPermission);
  const scopedAreaIds = useMemo(
    () => new Set(getScopedAreaIds(currentPermission, settings.buildings)),
    [currentPermission, settings.buildings],
  );

  const areaToFloorMap = useMemo(() => {
    const mapping = new Map<string, string>();
    settings.buildings.forEach((building) => {
      building.floors.forEach((floor) => {
        floor.areas.forEach((area) => {
          mapping.set(area.id, floor.id);
        });
      });
    });
    return mapping;
  }, [settings.buildings]);

  const scopedFloorIds = useMemo(() => {
    if (isSuperAdmin) {
      return new Set<string>();
    }

    const floorIds = Array.from(scopedAreaIds)
      .map((areaId) => areaToFloorMap.get(areaId))
      .filter((floorId): floorId is string => !!floorId);
    return new Set(floorIds);
  }, [areaToFloorMap, isSuperAdmin, scopedAreaIds]);

  const notificationsSeenStorageKey = useMemo(
    () => `${NOTIFICATIONS_SEEN_KEY_PREFIX}_${user?.id ?? 'anonymous'}`,
    [user?.id],
  );

  useEffect(() => {
    setSeenSignature(localStorage.getItem(notificationsSeenStorageKey) ?? '');
  }, [notificationsSeenStorageKey]);

  useEffect(() => {
    const syncIncidents = () => {
      setIncidents(loadIncidentsFromStorage());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'safeguard_incidents') {
        syncIncidents();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(INCIDENTS_UPDATED_EVENT, syncIncidents);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(INCIDENTS_UPDATED_EVENT, syncIncidents);
    };
  }, []);

  const isIncidentRelevant = (areaId: string) => {
    if (isSuperAdmin) {
      return true;
    }

    return scopedAreaIds.has(areaId);
  };

  const isActiveDrillRelevant = useMemo(() => {
    if (!activeDrill || activeDrill.status !== 'active') {
      return false;
    }

    if (isSuperAdmin) {
      return true;
    }

    const areaIds = activeDrill.location.areaIds ?? [];
    if (areaIds.some((areaId) => scopedAreaIds.has(areaId))) {
      return true;
    }

    const floorIds = activeDrill.location.floorIds ?? [];
    return floorIds.some((floorId) => scopedFloorIds.has(floorId));
  }, [activeDrill, isSuperAdmin, scopedAreaIds, scopedFloorIds]);

  const actionableNotifications = useMemo(() => {
    const messages: { id: string; signature: string; message: string }[] = [];

    if (isActiveDrillRelevant && activeDrill) {
      messages.push({
        id: 'active-drill',
        signature: `active-drill:${activeDrill.id}`,
        message: `An active ${activeDrill.type} drill is in progress for your assigned location.`,
      });
    }

    const relevantOpenIncidents = incidents.filter(
      (incident) => incident.status !== 'closed' && isIncidentRelevant(incident.location.areaId),
    );
    const highPriorityIncidents = relevantOpenIncidents.filter(
      (incident) => incident.severity === 'high' || incident.severity === 'critical',
    );

    if (highPriorityIncidents.length > 0) {
      messages.push({
        id: 'high-priority-incidents',
        signature: `high-priority-incidents:${highPriorityIncidents.length}`,
        message: `${highPriorityIncidents.length} high-priority incident update${highPriorityIncidents.length === 1 ? '' : 's'} require attention in your scope.`,
      });
    } else if (relevantOpenIncidents.length > 0) {
      messages.push({
        id: 'open-incidents',
        signature: `open-incidents:${relevantOpenIncidents.length}`,
        message: `${relevantOpenIncidents.length} incident update${relevantOpenIncidents.length === 1 ? '' : 's'} are active in your scope.`,
      });
    }

    const now = new Date();
    const overdueAssignedChecks = settings.complianceChecks.filter((check) => {
      if (!user?.id) {
        return false;
      }

      const isAssigned = check.assignedTo === user.id || check.assignedUsers.includes(user.id);
      if (!isAssigned) {
        return false;
      }

      return check.status === 'overdue' || (check.status !== 'completed' && new Date(check.nextDue).getTime() < now.getTime());
    });

    if (overdueAssignedChecks.length > 0) {
      messages.push({
        id: 'overdue-checks',
        signature: `overdue-checks:${overdueAssignedChecks.length}`,
        message: `${overdueAssignedChecks.length} assigned safety check${overdueAssignedChecks.length === 1 ? '' : 's'} are overdue.`,
      });
    }

    return messages;
  }, [activeDrill, incidents, isActiveDrillRelevant, settings.complianceChecks, user?.id]);

  const actionableSignature = useMemo(
    () => actionableNotifications.map((entry) => entry.signature).join('|'),
    [actionableNotifications],
  );

  const hasUnreadNotifications = actionableSignature.length > 0 && actionableSignature !== seenSignature;

  const markNotificationsAsSeen = () => {
    localStorage.setItem(notificationsSeenStorageKey, actionableSignature);
    setSeenSignature(actionableSignature);
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setIsNotificationsOpen(open);
    if (open) {
      markNotificationsAsSeen();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border hidden lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-14 sm:h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {navigation.find(n => n.href === location.pathname)?.name || 'SafeGuard'}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <DropdownMenu open={isNotificationsOpen} onOpenChange={handleNotificationsOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="w-5 h-5" />
                    {hasUnreadNotifications && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-emergency rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {actionableNotifications.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No new updates relevant to you.</div>
                  ) : (
                    <div className="space-y-1">
                      {actionableNotifications.map((notification) => (
                        <p key={notification.id} className="px-2 py-2 text-sm leading-relaxed text-foreground">
                          {notification.message}
                        </p>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-border">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-foreground">{user?.name || 'User'}</span>
                  <span className="text-xs text-muted-foreground">
                    {isImpersonating ? 'Impersonating session' : user?.role === 'admin' ? 'System Admin' : 'System User'}
                  </span>
                </div>
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
