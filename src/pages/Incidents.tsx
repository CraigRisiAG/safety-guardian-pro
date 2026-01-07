import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { IncidentForm } from '@/components/incidents/IncidentForm';
import { mockIncidents, buildings } from '@/data/mockData';
import { Incident, IncidentSeverity } from '@/types/safety';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const severityStyles = {
  low: 'bg-info-muted text-info border-info/20',
  medium: 'bg-warning-muted text-warning border-warning/20',
  high: 'bg-emergency-muted text-emergency border-emergency/20',
  critical: 'bg-emergency text-emergency-foreground border-emergency',
};

const statusStyles = {
  open: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning-muted' },
  investigating: { icon: Clock, color: 'text-info', bg: 'bg-info-muted' },
  resolved: { icon: CheckCircle2, color: 'text-safe', bg: 'bg-safe-muted' },
};

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getLocationName = (incident: Incident) => {
    const building = buildings.find(b => b.id === incident.location.buildingId);
    const floor = building?.floors.find(f => f.id === incident.location.floorId);
    const area = floor?.areas.find(a => a.id === incident.location.areaId);
    return { building: building?.name, floor: floor?.name, area: area?.name };
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const handleSubmit = (data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    buildingId: string;
    floorId: string;
    areaId: string;
  }) => {
    const newIncident: Incident = {
      id: `incident-${Date.now()}`,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'open',
      location: {
        buildingId: data.buildingId,
        floorId: data.floorId,
        areaId: data.areaId,
      },
      reportedBy: 'Safety Officer',
      reportedAt: new Date(),
    };
    setIncidents([newIncident, ...incidents]);
    setIsDialogOpen(false);
    toast.success('Incident reported successfully');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Incident Management</h1>
            <p className="text-muted-foreground mt-1">Track and manage safety incidents</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <IncidentForm 
                onSubmit={handleSubmit} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incidents List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filteredIncidents.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No incidents found
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const location = getLocationName(incident);
                const StatusIcon = statusStyles[incident.status].icon;
                return (
                  <div key={incident.id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        statusStyles[incident.status].bg
                      )}>
                        <StatusIcon className={cn('w-5 h-5', statusStyles[incident.status].color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-foreground">{incident.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {incident.description}
                            </p>
                          </div>
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border shrink-0',
                            severityStyles[incident.severity]
                          )}>
                            {incident.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>{location.area}, {location.floor}</span>
                          <span>•</span>
                          <span>Reported by {incident.reportedBy}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(incident.reportedAt, { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
