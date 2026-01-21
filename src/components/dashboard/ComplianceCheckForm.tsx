import { useState, useMemo } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Building2, Layers, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { CHECK_TYPE_LABELS, CompletedCheckRecord, CompletedCheckItem } from '@/types/compliance';

const STORAGE_KEY = 'safeguard_completed_checks';

const checkTypeCategories: Record<CompletedCheckRecord['checkType'], string[]> = {
  evacuation: ['fire-safety', 'equipment'],
  fire: ['fire-safety'],
  office: ['electrical', 'equipment'],
  first_aid: ['first-aid'],
};

export function ComplianceCheckForm() {
  const { user } = useAuth();
  const { settings } = useAdminSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [checkType, setCheckType] = useState<CompletedCheckRecord['checkType'] | ''>('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, { checked: boolean; notes: string }>>({});

  // Get available floors for selected building
  const selectedBuilding = settings.buildings.find(b => b.id === buildingId);
  const floors = selectedBuilding?.floors || [];
  
  // Get available areas for selected floor
  const selectedFloor = floors.find(f => f.id === floorId);
  const areas = selectedFloor?.areas || [];

  // Get check items based on check type
  const relevantItems = useMemo(() => {
    if (!checkType) return [];
    const categories = checkTypeCategories[checkType];
    return settings.safetyCheckItems.filter(item => categories.includes(item.category));
  }, [checkType, settings.safetyCheckItems]);

  const resetForm = () => {
    setCheckType('');
    setBuildingId('');
    setFloorId('');
    setAreaId('');
    setNotes('');
    setCheckedItems({});
  };

  const handleBuildingChange = (value: string) => {
    setBuildingId(value);
    setFloorId('');
    setAreaId('');
  };

  const handleFloorChange = (value: string) => {
    setFloorId(value);
    setAreaId('');
  };

  const handleCheckTypeChange = (value: CompletedCheckRecord['checkType']) => {
    setCheckType(value);
    setCheckedItems({});
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: {
        checked: !prev[itemId]?.checked,
        notes: prev[itemId]?.notes || '',
      },
    }));
  };

  const updateItemNotes = (itemId: string, itemNotes: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: {
        checked: prev[itemId]?.checked || false,
        notes: itemNotes,
      },
    }));
  };

  const handleSubmit = () => {
    if (!checkType || !buildingId || !floorId) {
      toast.error('Please select check type, building, and floor');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to complete a check');
      return;
    }

    const completedItems: CompletedCheckItem[] = relevantItems.map(item => ({
      itemId: item.id,
      itemName: item.name,
      checked: checkedItems[item.id]?.checked || false,
      notes: checkedItems[item.id]?.notes || undefined,
    }));

    const checkedCount = completedItems.filter(i => i.checked).length;
    const requiredItems = relevantItems.filter(i => i.required);
    const requiredChecked = requiredItems.filter(i => checkedItems[i.id]?.checked).length;

    let status: CompletedCheckRecord['status'] = 'pass';
    if (requiredChecked < requiredItems.length) {
      status = 'fail';
    } else if (checkedCount < relevantItems.length) {
      status = 'partial';
    }

    const record: CompletedCheckRecord = {
      id: `completed-${Date.now()}`,
      checkType,
      buildingId,
      floorId,
      areaId: areaId || undefined,
      completedBy: {
        userId: user.id,
        userName: user.name,
        email: user.email,
      },
      completedAt: new Date(),
      checkItems: completedItems,
      notes: notes.trim() || undefined,
      status,
    };

    // Save to localStorage
    const existing = localStorage.getItem(STORAGE_KEY);
    const records: CompletedCheckRecord[] = existing ? JSON.parse(existing) : [];
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    const buildingName = selectedBuilding?.name || 'Unknown';
    const floorName = selectedFloor?.name || 'Unknown';
    
    toast.success(
      `${CHECK_TYPE_LABELS[checkType]} completed for ${buildingName} - ${floorName}`,
      { description: `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}` }
    );

    resetForm();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer">
          <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <span className="font-medium text-foreground text-sm sm:text-base text-center">Compliance Check</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Complete Compliance Check
          </DialogTitle>
          <DialogDescription>
            Record a safety or compliance check for a specific location.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* Check Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Check Type *
              </Label>
              <Select value={checkType} onValueChange={handleCheckTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select check type..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHECK_TYPE_LABELS) as CompletedCheckRecord['checkType'][]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {CHECK_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Building *
              </Label>
              <Select value={buildingId} onValueChange={handleBuildingChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select building..." />
                </SelectTrigger>
                <SelectContent>
                  {settings.buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Floor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Floor *
              </Label>
              <Select value={floorId} onValueChange={handleFloorChange} disabled={!buildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={buildingId ? "Select floor..." : "Select building first"} />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Area/Section (Optional)
              </Label>
              <Select value={areaId} onValueChange={setAreaId} disabled={!floorId || areas.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!floorId ? "Select floor first" : areas.length === 0 ? "No areas defined" : "Select area..."} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check Items */}
            {checkType && relevantItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Check Items
                  </Label>
                  <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                    {relevantItems.map((item) => {
                      const isChecked = checkedItems[item.id]?.checked || false;
                      return (
                        <div key={item.id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={item.id}
                              checked={isChecked}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <label 
                                htmlFor={item.id} 
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                {item.name}
                                {item.required && (
                                  <Badge variant="outline" className="text-xs">Required</Badge>
                                )}
                              </label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            </div>
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-safe shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {/* Item-specific notes */}
                          <Textarea
                            placeholder="Add notes for this item..."
                            className="text-xs h-16"
                            value={checkedItems[item.id]?.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {checkType && relevantItems.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No check items configured for this type.
                <br />
                <span className="text-xs">Add items in Admin → Compliance & Safety</span>
              </div>
            )}

            {/* General Notes */}
            <div className="space-y-2">
              <Label>General Notes</Label>
              <Textarea
                placeholder="Add any general observations or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-20"
              />
            </div>

            {/* Summary */}
            {checkType && relevantItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completed by:</span>
                  <span className="font-medium">{user?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items checked:</span>
                  <span className="font-medium">
                    {Object.values(checkedItems).filter(i => i.checked).length} / {relevantItems.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); setIsOpen(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!checkType || !buildingId || !floorId}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
