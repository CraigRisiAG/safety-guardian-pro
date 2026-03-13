import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StartDrillForm } from '@/components/drills/StartDrillForm';
import { DrillDetailDialog } from '@/components/drills/DrillDetailDialog';
import { mockDrills, buildings } from '@/data/mockData';
import { Drill, DrillType, DrillRecord } from '@/types/safety';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Siren, Play, Clock, CheckCircle2, XCircle, MapPin, Calendar, Timer, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useDrillStatus } from '@/hooks/useDrillStatus';
import { Badge } from '@/components/ui/badge';

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
  const [selectedRecord, setSelectedRecord] = useState<DrillRecord | null>(null);
  const { startDrill, endDrill, drillRecords } = useDrillStatus();

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
    startDrill(newDrill);
    setIsDialogOpen(false);
    toast.success(`${drillTypeLabels[data.type]} started!`);
  };

  const handleEndDrill = (drillId: string) => {
    // Simulate some check-in stats
    const record = endDrill(
      { safe: Math.floor(Math.random() * 20) + 10, needsAssistance: Math.floor(Math.random() * 3), pending: Math.floor(Math.random() * 5) }
    );
    setDrills(drills.map(d => 
      d.id === drillId 
        ? { ...d, status: 'completed', completedAt: new Date() } 
        : d
    ));
    toast.success('Drill ended successfully');
  };

  const filteredDrills = drills.filter(drill => {
    if (activeTab === 'all') return true;
    if (activeTab === 'history') return false;
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
            <TabsTrigger value="history" className="gap-1">
              <BarChart3 className="w-3 h-3" />
              History & Stats
            </TabsTrigger>
          </TabsList>

          {/* Drill History Tab */}
          <TabsContent value="history" className="mt-6">
            <div className="space-y-4">
              {drillRecords.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No drill records yet</p>
                  <p className="text-sm mt-1">Completed drills will appear here with detailed statistics</p>
                </div>
              ) : (
                drillRecords.map((record) => (
                  <div key={record.id} className="bg-card border border-border rounded-xl p-6 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRecord(record)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-lg', drillTypeColors[record.type])}>
                          <Siren className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {drillTypeLabels[record.type]}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {record.buildingName}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {format(record.startedAt, 'PPP')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Initiated by {record.initiatedBy}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Completed
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-lg font-bold text-foreground">
                          <Timer className="w-4 h-4" />
                          {record.durationMinutes < 1 
                            ? `${Math.round(record.durationMinutes * 60)}s` 
                            : `${record.durationMinutes}m`}
                        </div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <div className="bg-safe-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-safe">{record.checkInStats.safe}</div>
                        <p className="text-xs text-muted-foreground">Safe</p>
                      </div>
                      <div className="bg-warning-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-warning">{record.checkInStats.needsAssistance}</div>
                        <p className="text-xs text-muted-foreground">Needed Help</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-muted-foreground">{record.checkInStats.pending}</div>
                        <p className="text-xs text-muted-foreground">Unaccounted</p>
                      </div>
                    </div>

                    {/* Floor Breakdown */}
                    {record.floorStats.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Floor Breakdown
                        </p>
                        <div className="grid gap-2">
                          {record.floorStats.map((fs) => (
                            <div key={fs.floorId} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                              <span className="font-medium text-foreground">{fs.floorName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-safe">{fs.safe} safe</span>
                                {fs.needsAssistance > 0 && (
                                  <span className="text-warning">{fs.needsAssistance} help</span>
                                )}
                                {fs.pending > 0 && (
                                  <span className="text-muted-foreground">{fs.pending} pending</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time details */}
                    <div className="border-t border-border pt-3 mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Started: {format(record.startedAt, 'PPp')}</span>
                      <span>Ended: {format(record.completedAt, 'PPp')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Other tabs */}
          {['all', 'active', 'scheduled', 'completed'].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-6">
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
                                onClick={() => handleEndDrill(drill.id)}
                              >
                                End Drill
                              </Button>
                            )}
                            {drill.status === 'scheduled' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const updated = drills.map(d => 
                                    d.id === drill.id 
                                      ? { ...d, status: 'active' as const, startedAt: new Date() } 
                                      : d
                                  );
                                  setDrills(updated);
                                  const activeDrill = updated.find(d => d.id === drill.id)!;
                                  startDrill(activeDrill);
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
          ))}
        </Tabs>

        <DrillDetailDialog
          record={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
        />
      </div>
    </AppLayout>
  );
}
