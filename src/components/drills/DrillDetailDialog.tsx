import { DrillRecord } from '@/types/safety';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Siren, MapPin, Calendar, Timer, Users, Download, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const drillTypeLabels: Record<string, string> = {
  fire: 'Fire Drill',
  earthquake: 'Earthquake Drill',
  lockdown: 'Lockdown Drill',
  evacuation: 'Evacuation Drill',
  medical: 'Medical Emergency',
};

const drillTypeColors: Record<string, string> = {
  fire: 'bg-emergency-muted text-emergency',
  earthquake: 'bg-warning-muted text-warning',
  lockdown: 'bg-primary/10 text-primary',
  evacuation: 'bg-info-muted text-info',
  medical: 'bg-safe-muted text-safe',
};

interface DrillDetailDialogProps {
  record: DrillRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrillDetailDialog({ record, open, onOpenChange }: DrillDetailDialogProps) {
  if (!record) return null;

  const totalPersonnel = record.checkInStats.total;
  const safePercent = totalPersonnel > 0 ? Math.round((record.checkInStats.safe / totalPersonnel) * 100) : 0;
  const responseRate = totalPersonnel > 0 ? Math.round(((totalPersonnel - record.checkInStats.pending) / totalPersonnel) * 100) : 0;

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Drill Report'],
      [],
      ['Type', drillTypeLabels[record.type] || record.type],
      ['Building', record.buildingName],
      ['Floors', record.floors.map(f => f.name).join(', ')],
      ['Initiated By', record.initiatedBy],
      ['Started At', format(record.startedAt, 'PPpp')],
      ['Completed At', format(record.completedAt, 'PPpp')],
      ['Duration (minutes)', record.durationMinutes],
      [],
      ['Check-In Summary'],
      ['Total Personnel', record.checkInStats.total],
      ['Safe', record.checkInStats.safe],
      ['Needed Assistance', record.checkInStats.needsAssistance],
      ['Unaccounted', record.checkInStats.pending],
      ['Response Rate', `${responseRate}%`],
      ['Safe Rate', `${safePercent}%`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Floor breakdown sheet
    if (record.floorStats.length > 0) {
      const floorData = [
        ['Floor', 'Safe', 'Needed Assistance', 'Pending', 'Total', 'Response Rate'],
        ...record.floorStats.map(fs => {
          const floorTotal = fs.safe + fs.needsAssistance + fs.pending;
          const floorResponse = floorTotal > 0 ? `${Math.round(((floorTotal - fs.pending) / floorTotal) * 100)}%` : 'N/A';
          return [fs.floorName, fs.safe, fs.needsAssistance, fs.pending, floorTotal, floorResponse];
        }),
      ];
      const floorSheet = XLSX.utils.aoa_to_sheet(floorData);
      floorSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, floorSheet, 'Floor Breakdown');
    }

    const fileName = `Drill_Report_${record.type}_${format(record.startedAt, 'yyyy-MM-dd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-lg', drillTypeColors[record.type])}>
                <Siren className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {drillTypeLabels[record.type]}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(record.startedAt, 'PPPP')}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="font-medium text-foreground">{record.buildingName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Floors: {record.floors.map(f => f.name).join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Initiated by {record.initiatedBy}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Start: {format(record.startedAt, 'p')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span>End: {format(record.completedAt, 'p')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span className="font-medium text-foreground">
                  Duration: {record.durationMinutes < 1
                    ? `${Math.round(record.durationMinutes * 60)} seconds`
                    : `${record.durationMinutes} minutes`}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{totalPersonnel}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="bg-safe-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-safe">{record.checkInStats.safe}</div>
              <p className="text-xs text-muted-foreground">Safe</p>
            </div>
            <div className="bg-warning-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">{record.checkInStats.needsAssistance}</div>
              <p className="text-xs text-muted-foreground">Needed Help</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{record.checkInStats.pending}</div>
              <p className="text-xs text-muted-foreground">Unaccounted</p>
            </div>
          </div>

          {/* Response Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">{responseRate}%</span>
                <Badge variant={responseRate >= 90 ? 'default' : responseRate >= 70 ? 'secondary' : 'destructive'} className="mb-1">
                  {responseRate >= 90 ? 'Excellent' : responseRate >= 70 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Safe Rate</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-safe">{safePercent}%</span>
                {record.checkInStats.needsAssistance > 0 && (
                  <span className="text-xs text-warning flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    {record.checkInStats.needsAssistance} needed assistance
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Floor Breakdown Table */}
          {record.floorStats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Floor-by-Floor Breakdown
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Floor</TableHead>
                      <TableHead className="text-center">Safe</TableHead>
                      <TableHead className="text-center">Needed Help</TableHead>
                      <TableHead className="text-center">Pending</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {record.floorStats.map((fs) => {
                      const floorTotal = fs.safe + fs.needsAssistance + fs.pending;
                      return (
                        <TableRow key={fs.floorId}>
                          <TableCell className="font-medium">{fs.floorName}</TableCell>
                          <TableCell className="text-center text-safe font-medium">{fs.safe}</TableCell>
                          <TableCell className="text-center text-warning font-medium">{fs.needsAssistance}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{fs.pending}</TableCell>
                          <TableCell className="text-center font-medium">{floorTotal}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
