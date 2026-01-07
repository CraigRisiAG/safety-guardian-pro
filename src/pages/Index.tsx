import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentIncidents } from '@/components/dashboard/RecentIncidents';
import { ActiveDrillBanner } from '@/components/dashboard/ActiveDrillBanner';
import { mockIncidents, mockDrills, mockCheckIns } from '@/data/mockData';
import { AlertTriangle, Siren, ShieldCheck, Users } from 'lucide-react';

const Index = () => {
  const [activeDrill] = useState(mockDrills.find(d => d.status === 'active') || null);
  
  const openIncidents = mockIncidents.filter(i => i.status !== 'resolved').length;
  const upcomingDrills = mockDrills.filter(d => d.status === 'scheduled').length;
  
  const checkInStats = {
    safe: mockCheckIns.filter(c => c.status === 'safe').length,
    needsAssistance: mockCheckIns.filter(c => c.status === 'needs-assistance').length,
    pending: mockCheckIns.filter(c => c.status === 'pending').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Active Drill Banner */}
        {activeDrill && (
          <ActiveDrillBanner 
            drill={activeDrill} 
            checkInCount={checkInStats}
            onEndDrill={() => console.log('End drill')}
          />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open Incidents"
            value={openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={openIncidents > 0 ? 'warning' : 'default'}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Scheduled Drills"
            value={upcomingDrills}
            icon={<Siren className="w-5 h-5" />}
            variant="info"
          />
          <StatCard
            title="Safety Compliance"
            value="94%"
            icon={<ShieldCheck className="w-5 h-5" />}
            variant="safe"
            trend={{ value: 3, isPositive: true }}
          />
          <StatCard
            title="Total Personnel"
            value={156}
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentIncidents incidents={mockIncidents} />
          
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <a 
                href="/incidents" 
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-warning-muted hover:bg-warning-muted/80 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-8 h-8 text-warning" />
                <span className="font-medium text-foreground">Report Incident</span>
              </a>
              <a 
                href="/drills" 
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-emergency-muted hover:bg-emergency-muted/80 transition-colors cursor-pointer"
              >
                <Siren className="w-8 h-8 text-emergency" />
                <span className="font-medium text-foreground">Start Drill</span>
              </a>
              <a 
                href="/check-in" 
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-safe-muted hover:bg-safe-muted/80 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-8 h-8 text-safe" />
                <span className="font-medium text-foreground">Safety Check-In</span>
              </a>
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-info-muted hover:bg-info-muted/80 transition-colors cursor-pointer">
                <Users className="w-8 h-8 text-info" />
                <span className="font-medium text-foreground">View Personnel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
