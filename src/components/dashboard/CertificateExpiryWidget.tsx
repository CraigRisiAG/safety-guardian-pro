import { useMemo, useState } from 'react';
import { Award, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCertificates } from '@/hooks/useCertificates';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useAuth } from '@/contexts/AuthContext';
import { CertificateManager } from '@/components/admin/CertificateManager';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import { format, differenceInDays } from 'date-fns';

type TrainingStatKey = 'assigned' | 'overdue' | 'passed' | 'failed' | 'follow_up';

type TrainingStatPerson = {
  id: string;
  name: string;
  email?: string;
  floorName?: string;
  areaName?: string;
  trainingName: string;
  nextDue: Date;
  lastOutcomeStatus?: string;
};

export function CertificateExpiryWidget() {
  const { certificates, expiringSoon, expired } = useCertificates();
  const { settings } = useAdminSettings();
  const { user } = useAuth();
  const [isCertificatesDialogOpen, setIsCertificatesDialogOpen] = useState(false);
  const [selectedTrainingStat, setSelectedTrainingStat] = useState<TrainingStatKey | null>(null);
  const complianceChecks = settings.complianceChecks || [];
  const userPermissions = settings.userPermissions || [];
  const buildings = settings.buildings || [];

  const validCount = useMemo(() =>
    certificates.filter(c => {
      const now = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return c.expiryDate > threeMonths;
    }).length,
    [certificates]
  );

  const alertItems = [...expired, ...expiringSoon];

  const trainingAssignments = useMemo(
    () => complianceChecks.filter((check) => check.category === 'training' && !!check.trainingDetails),
    [complianceChecks],
  );

  const currentUserPermission = useMemo(() => {
    if (!user) {
      return null;
    }

    return userPermissions.find(
      (permission) =>
        permission.email.toLowerCase() === user.email.toLowerCase() || permission.userId === user.id,
    ) ?? null;
  }, [user, userPermissions]);

  const isSuperAdmin = currentUserPermission?.role === 'super_admin';
  const isHsOfficer = !!currentUserPermission?.safetyRoles?.includes('health_safety_officer');
  const canViewTrainingPeople = isSuperAdmin || isHsOfficer;

  const floorNameById = useMemo(() => {
    const entries = buildings
      .flatMap((building) => building.floors)
      .map((floor) => [floor.id, floor.name] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [buildings]);

  const areaNameById = useMemo(() => {
    const entries = buildings
      .flatMap((building) => building.floors)
      .flatMap((floor) => floor.areas)
      .map((area) => [area.id, area.name] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [buildings]);

  const resolveParticipant = (participantId?: string, participantName?: string) => {
    if (!participantId && !participantName) {
      return null;
    }

    return userPermissions.find((permission) =>
      permission.id === participantId ||
      permission.userId === participantId ||
      (!!participantName && permission.userName === participantName),
    ) ?? null;
  };

  const visibleTrainingAssignments = useMemo(() => {
    if (!canViewTrainingPeople) {
      return [];
    }

    if (isSuperAdmin) {
      return trainingAssignments;
    }

    const floorScopeId = currentUserPermission?.primaryFloorId;
    if (!floorScopeId) {
      return [];
    }

    return trainingAssignments.filter((check) => {
      const participant = resolveParticipant(
        check.trainingDetails?.participantId,
        check.trainingDetails?.participantName,
      );

      if (participant?.primaryFloorId) {
        return participant.primaryFloorId === floorScopeId;
      }

      return (check.floorIds || []).includes(floorScopeId);
    });
  }, [canViewTrainingPeople, isSuperAdmin, currentUserPermission?.primaryFloorId, trainingAssignments, userPermissions]);

  const trainingStatPeople = useMemo<Record<TrainingStatKey, TrainingStatPerson[]>>(() => {
    const now = new Date();

    const personRows = visibleTrainingAssignments.map((check) => {
      const participant = resolveParticipant(
        check.trainingDetails?.participantId,
        check.trainingDetails?.participantName,
      );

      const floorId = participant?.primaryFloorId || check.floorIds?.[0];
      const areaId = participant?.primaryAreaId || check.areaIds?.[0];

      return {
        id: check.id,
        name: participant?.userName || check.trainingDetails?.participantName || 'Unknown User',
        email: participant?.email,
        floorName: floorId ? floorNameById[floorId] : undefined,
        areaName: areaId ? areaNameById[areaId] : undefined,
        trainingName: check.name,
        nextDue: check.nextDue,
        lastOutcomeStatus: check.trainingDetails?.lastOutcomeStatus,
        isOverdue: check.nextDue < now && check.status !== 'completed',
      };
    });

    return {
      assigned: personRows,
      overdue: personRows.filter((row) => row.isOverdue),
      passed: personRows.filter((row) => row.lastOutcomeStatus === 'pass'),
      failed: personRows.filter((row) => row.lastOutcomeStatus === 'fail'),
      follow_up: personRows.filter((row) => row.lastOutcomeStatus === 'cancelled'),
    };
  }, [visibleTrainingAssignments, floorNameById, areaNameById, userPermissions]);

  const trainingStats = useMemo(() => {
    return {
      assigned: trainingStatPeople.assigned.length,
      overdue: trainingStatPeople.overdue.length,
      passed: trainingStatPeople.passed.length,
      failed: trainingStatPeople.failed.length,
      followUp: trainingStatPeople.follow_up.length,
    };
  }, [trainingStatPeople]);

  const selectedTrainingPeople = selectedTrainingStat ? trainingStatPeople[selectedTrainingStat] : [];

  const statTitleMap: Record<TrainingStatKey, string> = {
    assigned: 'Assigned Training',
    overdue: 'Overdue Training',
    passed: 'Passed Training',
    failed: 'Failed Training',
    follow_up: 'Cancelled Training Follow-Up',
  };

  if (certificates.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-left hover:text-primary transition-colors"
            onClick={() => setIsCertificatesDialogOpen(true)}
            aria-label="Open H&S certificates"
          >
            <Award className="w-5 h-5 text-primary" />
            H&S Certificates
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-safe-muted rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-safe">{validCount}</div>
            <div className="text-[10px] text-muted-foreground">Valid</div>
          </div>
          <div className={`rounded-lg p-2 text-center ${expiringSoon.length > 0 ? 'bg-warning-muted' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold ${expiringSoon.length > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              {expiringSoon.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Expiring Soon</div>
          </div>
          <div className={`rounded-lg p-2 text-center ${expired.length > 0 ? 'bg-emergency-muted' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold ${expired.length > 0 ? 'text-emergency' : 'text-muted-foreground'}`}>
              {expired.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Training stats */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Training Stats</div>
          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => canViewTrainingPeople && setSelectedTrainingStat('assigned')}
              className="bg-info-muted rounded-lg p-2 text-center hover:opacity-90 disabled:opacity-60"
              disabled={!canViewTrainingPeople}
            >
              <div className="text-base font-bold text-info">{trainingStats.assigned}</div>
              <div className="text-[10px] text-muted-foreground">Assigned</div>
            </button>
            <button
              type="button"
              onClick={() => canViewTrainingPeople && setSelectedTrainingStat('overdue')}
              className={`rounded-lg p-2 text-center hover:opacity-90 disabled:opacity-60 ${trainingStats.overdue > 0 ? 'bg-warning-muted' : 'bg-muted/50'}`}
              disabled={!canViewTrainingPeople}
            >
              <div className={`text-base font-bold ${trainingStats.overdue > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {trainingStats.overdue}
              </div>
              <div className="text-[10px] text-muted-foreground">Overdue</div>
            </button>
            <button
              type="button"
              onClick={() => canViewTrainingPeople && setSelectedTrainingStat('passed')}
              className="bg-safe-muted rounded-lg p-2 text-center hover:opacity-90 disabled:opacity-60"
              disabled={!canViewTrainingPeople}
            >
              <div className="text-base font-bold text-safe">{trainingStats.passed}</div>
              <div className="text-[10px] text-muted-foreground">Passed</div>
            </button>
            <button
              type="button"
              onClick={() => canViewTrainingPeople && setSelectedTrainingStat('failed')}
              className={`rounded-lg p-2 text-center hover:opacity-90 disabled:opacity-60 ${trainingStats.failed > 0 ? 'bg-emergency-muted' : 'bg-muted/50'}`}
              disabled={!canViewTrainingPeople}
            >
              <div className={`text-base font-bold ${trainingStats.failed > 0 ? 'text-emergency' : 'text-muted-foreground'}`}>
                {trainingStats.failed}
              </div>
              <div className="text-[10px] text-muted-foreground">Failed</div>
            </button>
            <button
              type="button"
              onClick={() => canViewTrainingPeople && setSelectedTrainingStat('follow_up')}
              className={`rounded-lg p-2 text-center hover:opacity-90 disabled:opacity-60 ${trainingStats.followUp > 0 ? 'bg-emergency-muted' : 'bg-muted/50'}`}
              disabled={!canViewTrainingPeople}
            >
              <div className={`text-base font-bold ${trainingStats.followUp > 0 ? 'text-emergency' : 'text-muted-foreground'}`}>
                {trainingStats.followUp}
              </div>
              <div className="text-[10px] text-muted-foreground">Follow-Up</div>
            </button>
          </div>
          {!canViewTrainingPeople && (
            <div className="text-[11px] text-muted-foreground">
              Only Super Admins and H&S Officers can view training people lists.
            </div>
          )}
        </div>

        {/* Alert items */}
        {alertItems.length > 0 && (
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-2">
              {alertItems.map(cert => {
                const isExpired = cert.expiryDate <= new Date();
                const daysUntil = differenceInDays(cert.expiryDate, new Date());
                
                return (
                  <div
                    key={cert.id}
                    className={`p-2.5 rounded-lg border text-sm ${
                      isExpired 
                        ? 'bg-emergency-muted/50 border-emergency/30' 
                        : 'bg-warning-muted/50 border-warning/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpired ? (
                          <XCircle className="w-3.5 h-3.5 text-emergency shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                        )}
                        <span className="font-medium truncate">{cert.userName}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        isExpired ? 'text-emergency border-emergency/50' : 'text-warning border-warning/50'
                      }`}>
                        {isExpired ? 'Expired' : `${daysUntil}d left`}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>{CERTIFICATE_TYPE_LABELS[cert.certificateType]}</span>
                      <span>Expires {format(cert.expiryDate, 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {alertItems.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-safe p-2 bg-safe-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            All certificates are valid
          </div>
        )}
      </CardContent>

      <Dialog open={isCertificatesDialogOpen} onOpenChange={setIsCertificatesDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>H&S Certificates</DialogTitle>
            <DialogDescription>
              Manage certificates using the same controls available in the Admin screen.
            </DialogDescription>
          </DialogHeader>
          <CertificateManager />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTrainingStat} onOpenChange={(open) => !open && setSelectedTrainingStat(null)}>
        <DialogContent className="max-w-2xl max-h-[75vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedTrainingStat ? statTitleMap[selectedTrainingStat] : 'Training People'}</DialogTitle>
            <DialogDescription>
              {isSuperAdmin
                ? 'Showing all visible people for this training metric.'
                : 'Showing people on your floor for this training metric.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-2">
            {selectedTrainingPeople.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No people found for this selection.</div>
            ) : (
              <div className="space-y-2">
                {selectedTrainingPeople.map((person) => (
                  <div key={`${person.id}-${person.name}`} className="rounded-lg border p-3 bg-card">
                    <div className="text-sm font-medium">{person.name}</div>
                    <div className="text-xs text-muted-foreground">{person.trainingName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {person.floorName ? `Floor: ${person.floorName}` : 'Floor: Unassigned'}
                      {person.areaName ? ` • Area: ${person.areaName}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Due {format(person.nextDue, 'dd MMM yyyy')}
                      {person.lastOutcomeStatus ? ` • Outcome: ${person.lastOutcomeStatus}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
