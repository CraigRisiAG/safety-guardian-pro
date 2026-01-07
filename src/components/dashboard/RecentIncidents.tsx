import { Incident } from '@/types/safety';
import { buildings } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';

interface RecentIncidentsProps {
  incidents: Incident[];
}

const severityStyles = {
  low: 'bg-info-muted text-info border-info/20',
  medium: 'bg-warning-muted text-warning border-warning/20',
  high: 'bg-emergency-muted text-emergency border-emergency/20',
  critical: 'bg-emergency text-emergency-foreground border-emergency',
};

const statusIcons = {
  open: AlertTriangle,
  investigating: Search,
  resolved: CheckCircle2,
};

export function RecentIncidents({ incidents }: RecentIncidentsProps) {
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
              <div key={incident.id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
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
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                      severityStyles[incident.severity]
                    )}>
                      {incident.severity}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(incident.reportedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
