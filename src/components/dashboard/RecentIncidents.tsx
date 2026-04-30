import { useState } from 'react';
import { Incident } from '@/types/safety';
import { CustomBuilding } from '@/types/admin';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IncidentEditForm } from '@/components/incidents/IncidentEditForm';

interface RecentIncidentsProps {
  incidents: Incident[];
  buildings: CustomBuilding[];
  onUpdateIncident: (incidentId: string, updates: {
    title: string;
    description: string;
    severity: Incident['severity'];
    status: Incident['status'];
    rootCause?: string;
  }) => void;
}

const severityStyles = {
  low: 'bg-info-muted text-info border-info/20',
  medium: 'bg-warning-muted text-warning border-warning/20',
  high: 'bg-emergency-muted text-emergency border-emergency/20',
  critical: 'bg-emergency text-emergency-foreground border-emergency',
};

const statusIcons = {
  open: AlertTriangle,
  in_progress: Clock,
  closed: CheckCircle2,
};

const statusStyles = {
  open: {
    row: 'bg-emergency-muted/35 border-emergency/15',
    label: 'Open',
    badge: 'bg-emergency-muted text-emergency border-emergency/20',
  },
  in_progress: {
    row: 'bg-info-muted/35 border-info/15',
    label: 'In Progress',
    badge: 'bg-info-muted text-info border-info/20',
  },
  closed: {
    row: 'bg-safe-muted/35 border-safe/15',
    label: 'Closed',
    badge: 'bg-safe-muted text-safe border-safe/20',
  },
};

export function RecentIncidents({ incidents, buildings, onUpdateIncident }: RecentIncidentsProps) {
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const getLocationName = (incident: Incident) => {
    const building = buildings.find(b => b.id === incident.location.buildingId);
    const floor = building?.floors.find(f => f.id === incident.location.floorId);
    const area = floor?.areas.find(a => a.id === incident.location.areaId);
    return `${area?.name || ''}, ${floor?.name || ''}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Incidents</h3>
      </div>
      <div className="divide-y divide-border">
        {incidents.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">
            No incidents reported
          </div>
        ) : (
          incidents.slice(0, 5).map((incident) => {
            const StatusIcon = statusIcons[incident.status];
            return (
              <div
                key={incident.id}
                className={cn(
                  'px-6 py-4 border-l-4 transition-colors hover:brightness-[0.98]',
                  statusStyles[incident.status].row,
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-2 rounded-lg border',
                    severityStyles[incident.severity]
                  )}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{incident.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{getLocationName(incident)}</p>
                    {incident.rootCause && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Root cause: {incident.rootCause}</p>
                    )}
                  </div>
                  <div className="text-right flex items-start gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setEditingIncident(incident)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                      severityStyles[incident.severity]
                    )}>
                      {incident.severity}
                    </span>
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                      statusStyles[incident.status].badge,
                    )}>
                      {statusStyles[incident.status].label}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(incident.reportedAt, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={Boolean(editingIncident)} onOpenChange={(open) => !open && setEditingIncident(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {editingIncident && (
            <IncidentEditForm
              incident={editingIncident}
              onSave={(updates) => {
                onUpdateIncident(editingIncident.id, updates);
                setEditingIncident(null);
              }}
              onCancel={() => setEditingIncident(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
