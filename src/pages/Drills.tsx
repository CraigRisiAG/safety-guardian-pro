import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StartDrillForm } from '@/components/drills/StartDrillForm';
import { mockDrills, buildings } from '@/data/mockData';
import { Drill, DrillType } from '@/types/safety';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Siren, Play, Clock, CheckCircle2, XCircle, MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const drillTypeLabels: Record<DrillType, string> = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency',
};

const drillTypeColors: Record<DrillType, string> = {
  fire: 'bg-emergency-muted text-emergency',
  earthquake: 'bg-warning-muted text-warning',
  lockdown: 'bg-primary/10 text-primary',
  evacuation: 'bg-info-muted text-info',
  medical: 'bg-safe-muted text-safe',
};

const statusConfig = {
  scheduled: { icon: Calendar, color: 'text-info', bg: 'bg-info-muted', label: 'Scheduled' },
  active: { icon: Play, color: 'text-emergency', bg: 'bg-emergency-muted', label: 'Active' },
  completed: { icon: CheckCircle2, color: 'text-safe', bg: 'bg-safe-muted', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Cancelled' },
};

export default function Drills() {
  const [drills, setDrills] = useState<Drill[]>(mockDrills);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleStartDrill = (data: {
    type: DrillType;
    buildingId: string;
    floorIds: string[];
  }) => {
    const newDrill: Drill = {
      id: `drill-${Date.now()}`,
      type: data.type,
      status: 'active',
      location: {
        buildingId: data.buildingId,
        floorIds: data.floorIds,
        areaIds: [],
      },
      startedAt: new Date(),
      initiatedBy: 'Safety Officer',
    };
    setDrills([newDrill, ...drills]);
    setIsDialogOpen(false);
    toast.success(`${drillTypeLabels[data.type]} started!`);
  };

  const filteredDrills = drills.filter(drill => {
    if (activeTab === 'all') return true;
    return drill.status === activeTab;
  });

  const getLocationDisplay = (drill: Drill) => {
    const building = buildings.find(b => b.id === drill.location.buildingId);
    const floors = building?.floors.filter(f => drill.location.floorIds.includes(f.id)) || [];
    return {
      building: building?.name || 'Unknown',
      floors: floors.map(f => f.name).join(', ') || 'All floors',
    };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Drill Management</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage safety drills</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-emergency text-emergency-foreground hover:opacity-90">
                <Siren className="w-4 h-4" />
                Start Drill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <StartDrillForm 
                onSubmit={handleStartDrill} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Drills</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid gap-4">
              {filteredDrills.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                  No drills found
                </div>
              ) : (
                filteredDrills.map((drill) => {
                  const status = statusConfig[drill.status];
                  const StatusIcon = status.icon;
                  const location = getLocationDisplay(drill);
                  
                  return (
                    <div 
                      key={drill.id} 
                      className={cn(
                        'bg-card border border-border rounded-xl p-6 transition-all hover:shadow-md',
                        drill.status === 'active' && 'ring-2 ring-emergency/50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-3 rounded-lg', drillTypeColors[drill.type])}>
                            <Siren className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-foreground">
                                {drillTypeLabels[drill.type]}
                              </h3>
                              <span className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                                status.bg, status.color
                              )}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {location.building}
                              </span>
                              <span>•</span>
                              <span>{location.floors}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {drill.startedAt 
                                  ? `Started ${formatDistanceToNow(drill.startedAt, { addSuffix: true })}`
                                  : drill.scheduledFor
                                  ? `Scheduled for ${format(drill.scheduledFor, 'PPp')}`
                                  : 'Not scheduled'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {drill.status === 'active' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDrills(drills.map(d => 
                                  d.id === drill.id 
                                    ? { ...d, status: 'completed', completedAt: new Date() } 
                                    : d
                                ));
                                toast.success('Drill ended successfully');
                              }}
                            >
                              End Drill
                            </Button>
                          )}
                          {drill.status === 'scheduled' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setDrills(drills.map(d => 
                                  d.id === drill.id 
                                    ? { ...d, status: 'active', startedAt: new Date() } 
                                    : d
                                ));
                                toast.success(`${drillTypeLabels[drill.type]} started!`);
                              }}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
