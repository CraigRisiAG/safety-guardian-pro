import { useState, useMemo } from 'react';
import { History, ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Building2, Calendar, User, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CompletedCheckRecord, CHECK_TYPE_LABELS } from '@/types/compliance';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { format, parseISO, isAfter, subDays } from 'date-fns';

const STORAGE_KEY = 'safeguard_completed_checks';

export function ComplianceHistoryDialog() {
  const { settings } = useAdminSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const records = useMemo(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored)
      .map((r: any) => ({
        ...r,
        completedAt: typeof r.completedAt === 'string' ? parseISO(r.completedAt) : new Date(r.completedAt)
      }))
      .sort((a: CompletedCheckRecord, b: CompletedCheckRecord) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
  }, [isOpen]); // Refresh when dialog opens

  const filteredRecords = useMemo(() => {
    return records.filter((record: CompletedCheckRecord) => {
      if (typeFilter !== 'all' && record.checkType !== typeFilter) return false;
      if (buildingFilter !== 'all' && record.buildingId !== buildingFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      
      if (dateFilter !== 'all') {
        const now = new Date();
        const cutoff = subDays(now, parseInt(dateFilter));
        if (!isAfter(record.completedAt, cutoff)) return false;
      }
      
      return true;
    });
  }, [records, typeFilter, buildingFilter, statusFilter, dateFilter]);

  const getBuildingName = (buildingId: string) => {
    return settings.buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  };

  const getFloorName = (buildingId: string, floorId: string) => {
    const building = settings.buildings.find(b => b.id === buildingId);
    return building?.floors.find(f => f.id === floorId)?.name || 'Unknown';
  };

  const getAreaName = (buildingId: string, floorId: string, areaId?: string) => {
    if (!areaId) return null;
    const building = settings.buildings.find(b => b.id === buildingId);
    const floor = building?.floors.find(f => f.id === floorId);
    return floor?.areas.find(a => a.id === areaId)?.name || null;
  };

  const getStatusBadge = (status: CompletedCheckRecord['status']) => {
    switch (status) {
      case 'pass':
        return (
          <Badge className="bg-safe-muted text-safe">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pass
          </Badge>
        );
      case 'fail':
        return (
          <Badge className="bg-emergency-muted text-emergency">
            <XCircle className="w-3 h-3 mr-1" />
            Fail
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning-muted text-warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
    }
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setBuildingFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const hasActiveFilters = typeFilter !== 'all' || buildingFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-muted hover:bg-muted/80 transition-colors cursor-pointer">
          <History className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm sm:text-base text-center">Check History</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Compliance Check History
          </DialogTitle>
          <DialogDescription>
            View all completed compliance checks with filtering options.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Check Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.keys(CHECK_TYPE_LABELS) as CompletedCheckRecord['checkType'][]).map(type => (
                <SelectItem key={type} value={type}>{CHECK_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {settings.buildings.map(building => (
                <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              Clear Filters
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          </div>
        </div>

        <Separator />

        {/* Records Table */}
        <ScrollArea className="h-[400px]">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No compliance checks found</p>
              <p className="text-sm">Complete a check from the dashboard to see it here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record: CompletedCheckRecord) => {
                  const checkedCount = record.checkItems.filter(i => i.checked).length;
                  const areaName = getAreaName(record.buildingId, record.floorId, record.areaId);
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{format(record.completedAt, 'MMM d, yyyy')}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(record.completedAt, 'h:mm a')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CHECK_TYPE_LABELS[record.checkType].replace(' Check', '')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{getBuildingName(record.buildingId)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getFloorName(record.buildingId, record.floorId)}
                          {areaName && ` • ${areaName}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{record.completedBy.userName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{record.completedBy.email}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium">{checkedCount}</span>
                        <span className="text-muted-foreground">/{record.checkItems.length}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
