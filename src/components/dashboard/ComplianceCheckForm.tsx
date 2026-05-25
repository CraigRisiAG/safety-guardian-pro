import { useState, useMemo, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Building2, Layers, MapPin, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useCertificates } from '@/hooks/useCertificates';
import { CHECK_TYPE_LABELS, CompletedCheckRecord, CompletedCheckItem } from '@/types/compliance';
import { Input } from '@/components/ui/input';
import { ComplianceCheck, UserPermission } from '@/types/admin';
import { normalizeTrainingCertificateType } from '@/types/certificates';
import { completeMissedComplianceForCheck } from '@/lib/complianceMonitoring';
import { getNextComplianceDueDate } from '@/utils/complianceRecurrence';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificates';

const STORAGE_KEY = 'safeguard_completed_checks';

const checkTypeCategories: Record<CompletedCheckRecord['checkType'], string[]> = {
  evacuation: ['fire-safety', 'equipment'],
  fire: ['fire-safety'],
  office: ['electrical', 'equipment'],
  first_aid: ['first-aid'],
  training: ['training'],
};

// Map scheduled check categories to check types
const categoryToCheckType: Record<string, CompletedCheckRecord['checkType']> = {
  'fire-safety': 'fire',
  'first-aid': 'first_aid',
  'electrical': 'office',
  'equipment': 'office',
  'training': 'training',
};

type TrainingOutcomeStatus = Extract<CompletedCheckRecord['status'], 'pass' | 'fail' | 'not_done' | 'cancelled'>;

interface ComplianceCheckFormProps {
  preselectedCheck?: ComplianceCheck | null;
  onBehalfOf?: UserPermission | null;
  openRequestId?: number;
  onCheckComplete?: () => void;
}

type CustomFieldValue = string | number | boolean | undefined;
type CompletedCheckRecordWithCustomFields = CompletedCheckRecord & {
  customFieldValues?: Record<string, CustomFieldValue>;
};

export function ComplianceCheckForm({ 
  preselectedCheck, 
  onBehalfOf, 
  openRequestId = 0,
  onCheckComplete 
}: ComplianceCheckFormProps) {
  const { user } = useAuth();
  const { settings, updateComplianceCheck } = useAdminSettings();
  const { upsertCertificateForTrainingPass, certificateValidityYearsByType } = useCertificates();
  const [isOpen, setIsOpen] = useState(false);
  const [checkType, setCheckType] = useState<CompletedCheckRecord['checkType'] | ''>('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, { checked: boolean; notes: string }>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({});
  const [trainingStatus, setTrainingStatus] = useState<TrainingOutcomeStatus>('pass');
  const [trainingReason, setTrainingReason] = useState('');
  const [trainingNewDate, setTrainingNewDate] = useState('');
  const [showPassConfirmation, setShowPassConfirmation] = useState(false);
  const [passCertificationDate, setPassCertificationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const isTrainingSelected = checkType === 'training';

  const trainingCourseLabel = preselectedCheck?.trainingDetails?.certificateLabel || preselectedCheck?.name || 'Training course';
  const trainingParticipantLabel = preselectedCheck?.trainingDetails?.participantName;
  const normalizedTrainingType = preselectedCheck?.trainingDetails
    ? normalizeTrainingCertificateType(preselectedCheck.trainingDetails.certificateType)
    : null;
  const trainingValidityYears = normalizedTrainingType ? certificateValidityYearsByType[normalizedTrainingType] : 3;

  const parseCertificationDate = () => {
    if (!passCertificationDate) {
      return null;
    }
    return new Date(`${passCertificationDate}T00:00:00`);
  };

  // Auto-open and prefill when a scheduled check is selected
  useEffect(() => {
    if (preselectedCheck) {
      setIsOpen(true);
      // Map the category to a check type
      const mappedType = categoryToCheckType[preselectedCheck.category] || 'office';
      setCheckType(mappedType);
      if (mappedType === 'training') {
        setBuildingId('');
        setFloorId('');
        setAreaId('');
      } else if (preselectedCheck.buildingIds.length > 0) {
        // Pre-select first building for non-training checks.
        setBuildingId(preselectedCheck.buildingIds[0]);
      }
    }
  }, [preselectedCheck, openRequestId]);

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

  // Get custom fields configured for this check type
  const customFields = useMemo(() => {
    if (!checkType) return [];
    return (settings.checkTypeFields || [])
      .filter((f) => f.checkType === checkType && f.enabled)
      .sort((a, b) => a.order - b.order);
  }, [checkType, settings.checkTypeFields]);

  const resetForm = () => {
    setCheckType('');
    setBuildingId('');
    setFloorId('');
    setAreaId('');
    setNotes('');
    setCheckedItems({});
    setCustomFieldValues({});
    setTrainingStatus('pass');
    setTrainingReason('');
    setTrainingNewDate('');
    setShowPassConfirmation(false);
    setPassCertificationDate(new Date().toISOString().slice(0, 10));
    onCheckComplete?.();
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
    setCustomFieldValues({});
    if (value === 'training') {
      setBuildingId('');
      setFloorId('');
      setAreaId('');
    }
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

  const handleSubmit = (options?: { skipPassConfirmation?: boolean; certificationDate?: Date }) => {
        const isTrainingCheck = checkType === 'training';

        if (isTrainingCheck && (trainingStatus === 'not_done' || trainingStatus === 'cancelled')) {
          if (!trainingReason.trim()) {
            toast.error(`Missing required field: Reason. Explain why ${trainingCourseLabel} was ${trainingStatus === 'not_done' ? 'not done' : 'cancelled'}.`);
            return;
          }
          if (!trainingNewDate) {
            toast.error(`Missing required field: New Training Date. Set the next date for ${trainingCourseLabel}.`);
            return;
          }
        }

    if (!checkType) {
      toast.error('Please select check type');
      return;
    }

    if (!isTrainingCheck && (!buildingId || !floorId)) {
      toast.error('Please select building and floor');
      return;
    }

    // Validate compulsory custom fields
    const missingRequired = customFields.filter((f) => {
      if (!f.required) return false;
      const v = customFieldValues[f.id];
      if (f.type === 'checkbox') return !v;
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (missingRequired.length > 0) {
      toast.error(`Please complete: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    // Use onBehalfOf user or current user
    const completingUser = onBehalfOf || (user ? {
      id: user.id,
      userName: user.name,
      email: user.email,
    } : null);

    if (!completingUser) {
      toast.error('You must be logged in to complete a check');
      return;
    }

    const completedItems: CompletedCheckItem[] = isTrainingCheck
      ? []
      : relevantItems.map(item => ({
          itemId: item.id,
          itemName: item.name,
          checked: checkedItems[item.id]?.checked || false,
          notes: checkedItems[item.id]?.notes || undefined,
        }));

    let status: CompletedCheckRecord['status'];
    if (isTrainingCheck) {
      status = trainingStatus;
    } else {
      const checkedCount = completedItems.filter(i => i.checked).length;
      const requiredItems = relevantItems.filter(i => i.required);
      const requiredChecked = requiredItems.filter(i => checkedItems[i.id]?.checked).length;

      status = 'pass';
      if (requiredChecked < requiredItems.length) {
        status = 'fail';
      } else if (checkedCount < relevantItems.length) {
        status = 'partial';
      }
    }

    if (isTrainingCheck && status === 'pass' && !options?.skipPassConfirmation) {
      setShowPassConfirmation(true);
      return;
    }

    const record: CompletedCheckRecordWithCustomFields = {
      id: `completed-${Date.now()}`,
      checkType,
      buildingId: isTrainingCheck
        ? preselectedCheck?.buildingIds?.[0] || 'training'
        : buildingId,
      floorId: isTrainingCheck
        ? preselectedCheck?.floorIds?.[0] || 'training'
        : floorId,
      areaId: areaId || undefined,
      completedBy: {
        userId: 'userId' in completingUser ? completingUser.userId : completingUser.id,
        userName: completingUser.userName,
        email: completingUser.email,
      },
      completedAt: new Date(),
      checkItems: completedItems,
      notes: notes.trim() || undefined,
      status,
      outcomeReason:
        isTrainingCheck && (status === 'not_done' || status === 'cancelled')
          ? trainingReason.trim()
          : undefined,
      followUpDate:
        isTrainingCheck && (status === 'not_done' || status === 'cancelled') && trainingNewDate
          ? new Date(trainingNewDate)
          : undefined,
    };
    if (customFields.length > 0) {
      record.customFieldValues = customFields.reduce((acc, f) => {
        acc[f.name] = customFieldValues[f.id];
        return acc;
      }, {} as Record<string, CustomFieldValue>);
    }

    // Save to localStorage
    const existing = localStorage.getItem(STORAGE_KEY);
    const records: CompletedCheckRecord[] = existing ? JSON.parse(existing) : [];
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    // Update the scheduled check status if this was from a preselected check
    if (preselectedCheck) {
      const completionDate = new Date();
      const shouldRescheduleTraining = isTrainingCheck && (status === 'not_done' || status === 'cancelled') && !!trainingNewDate;
      const resolvedMissed = shouldRescheduleTraining ? false : completeMissedComplianceForCheck(preselectedCheck.id);

      const updates: Partial<ComplianceCheck> = {
        lastCompleted: shouldRescheduleTraining ? preselectedCheck.lastCompleted : completionDate,
      };

      if (isTrainingCheck) {
        updates.trainingDetails = {
          ...preselectedCheck.trainingDetails,
          lastOutcomeStatus: status,
          lastOutcomeAt: completionDate,
          lastOutcomeReason:
            status === 'not_done' || status === 'cancelled'
              ? trainingReason.trim()
              : undefined,
          followUpDate:
            status === 'not_done' || status === 'cancelled'
              ? (trainingNewDate ? new Date(trainingNewDate) : undefined)
              : undefined,
        };
      }

      if (shouldRescheduleTraining) {
        updates.status = 'pending';
        updates.nextDue = new Date(trainingNewDate);
      } else if (preselectedCheck.isRecurring) {
        const baseDate = new Date(preselectedCheck.nextDue);
        updates.status = 'pending';
        updates.nextDue = getNextComplianceDueDate(preselectedCheck, baseDate);
      } else {
        updates.status = 'completed';
      }

      updateComplianceCheck(preselectedCheck.id, {
        ...updates,
      });

      if (resolvedMissed) {
        toast.success('Missed check resolved and marked completed');
      }

      if (isTrainingCheck && status === 'pass') {
        const details = preselectedCheck.trainingDetails;
        const text = `${preselectedCheck.name} ${preselectedCheck.description}`.toLowerCase();

        let rawCertificateType = details?.certificateType;
        if (!rawCertificateType) {
          if (text.includes('fire marshall')) rawCertificateType = 'fire_marshall';
          else if (text.includes('evac chair')) rawCertificateType = 'evac_chair';
          else if (text.includes('evacuation warden') || text.includes('evacuation')) rawCertificateType = 'evacuation';
          else if (text.includes('first aid') || text.includes('first aider')) rawCertificateType = 'first_aid';
          else if (text.includes('health & safety') || text.includes('h&s') || text.includes('health safety')) rawCertificateType = 'health_safety_officer';
        }

        const normalizedType = rawCertificateType ? normalizeTrainingCertificateType(rawCertificateType) : null;

        const completedByUserId = 'userId' in completingUser ? completingUser.userId : completingUser.id;
        const completingPermission = settings.userPermissions.find(
          (entry) => entry.userId === completedByUserId || entry.email.toLowerCase() === completingUser.email.toLowerCase(),
        );

        const participant = settings.userPermissions.find((entry) =>
          entry.id === details?.participantId ||
          entry.userId === details?.participantId ||
          (!!details?.participantName && entry.userName === details.participantName),
        );

        if (normalizedType) {
          upsertCertificateForTrainingPass({
            userId: participant?.id || completingPermission?.id || details?.participantId || completedByUserId,
            userName: participant?.userName || details?.participantName || completingUser.userName,
            email: participant?.email || completingPermission?.email || completingUser.email,
            certificateType: normalizedType,
            certificationDate: options?.certificationDate || completionDate,
          });
        } else {
          toast.error('Could not determine certificate type from this training record. Please update training details and try again.');
        }
      }
    }

    const buildingName = selectedBuilding?.name || 'Unknown';
    const floorName = selectedFloor?.name || 'Unknown';
    
    const completionMessage = onBehalfOf 
      ? `${CHECK_TYPE_LABELS[checkType]} completed on behalf of ${onBehalfOf.userName}`
      : `${CHECK_TYPE_LABELS[checkType]} completed`;
    
    toast.success(
      checkType === 'training'
        ? completionMessage
        : `${completionMessage} for ${buildingName} - ${floorName}`,
      { description: `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}` }
    );

    resetForm();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer hover-scale hover:shadow-lg hover:shadow-primary/20">
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
            {/* On Behalf Of Alert */}
            {onBehalfOf && (
              <Alert className="bg-info-muted border-info/30">
                <UserCheck className="w-4 h-4 text-info" />
                <AlertDescription className="text-sm">
                  Completing this check on behalf of <strong>{onBehalfOf.userName}</strong>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Preselected Check Info */}
            {preselectedCheck && (
              <Alert className="bg-primary/10 border-primary/30">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <AlertDescription className="text-sm">
                  Completing scheduled check: <strong>{preselectedCheck.name}</strong>
                </AlertDescription>
              </Alert>
            )}
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

            {checkType !== 'training' && (
              <>
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
                      <SelectValue placeholder={buildingId ? 'Select floor...' : 'Select building first'} />
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
                      <SelectValue placeholder={!floorId ? 'Select floor first' : areas.length === 0 ? 'No areas defined' : 'Select area...'} />
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
              </>
            )}

            {/* Check Items */}
            {checkType === 'training' && (
              <>
                <Separator />
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <Alert className="bg-primary/10 border-primary/30">
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    <AlertDescription className="text-sm space-y-1">
                      <div>
                        <strong>Course:</strong> {trainingCourseLabel}
                      </div>
                      {trainingParticipantLabel && (
                        <div>
                          <strong>Participant:</strong> {trainingParticipantLabel}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  <Label>Training Outcome</Label>
                  <Select value={trainingStatus} onValueChange={(value: TrainingOutcomeStatus) => setTrainingStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Passed</SelectItem>
                      <SelectItem value="fail">Failed</SelectItem>
                      <SelectItem value="not_done">Not Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {(trainingStatus === 'not_done' || trainingStatus === 'cancelled') && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Required fields for this outcome: Reason and New Training Date.
                      </p>
                      <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Textarea
                          placeholder="Enter reason..."
                          value={trainingReason}
                          onChange={(e) => setTrainingReason(e.target.value)}
                          className="h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Training Date *</Label>
                        <Input
                          type="date"
                          value={trainingNewDate}
                          onChange={(e) => setTrainingNewDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {checkType && checkType !== 'training' && relevantItems.length > 0 && (
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

            {checkType && checkType !== 'training' && relevantItems.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No check items configured for this type.
                <br />
                <span className="text-xs">Add items in Admin → Compliance & Safety</span>
              </div>
            )}

            {/* Custom fields configured for this check type */}
            {checkType && customFields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    Additional Details
                  </Label>
                  <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                    {customFields.map((field) => {
                      const value = customFieldValues[field.id];
                      const setValue = (v: CustomFieldValue) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: v }));
                      return (
                        <div key={field.id} className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-sm">
                            {field.label}
                            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </Label>
                          {field.type === 'text' && (
                            <Input placeholder={field.placeholder} value={value || ''} onChange={(e) => setValue(e.target.value)} />
                          )}
                          {field.type === 'number' && (
                            <Input type="number" placeholder={field.placeholder} value={value ?? ''} onChange={(e) => setValue(e.target.value)} />
                          )}
                          {field.type === 'date' && (
                            <Input type="date" value={value || ''} onChange={(e) => setValue(e.target.value)} />
                          )}
                          {field.type === 'textarea' && (
                            <Textarea placeholder={field.placeholder} value={value || ''} onChange={(e) => setValue(e.target.value)} className="h-20" />
                          )}
                          {field.type === 'select' && (
                            <Select value={value || ''} onValueChange={setValue}>
                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {(field.options || []).map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === 'checkbox' && (
                            <div className="flex items-center gap-2">
                              <Checkbox checked={!!value} onCheckedChange={(c) => setValue(!!c)} id={`cf-${field.id}`} />
                              <label htmlFor={`cf-${field.id}`} className="text-sm cursor-pointer">Yes</label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
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
            {checkType && checkType !== 'training' && relevantItems.length > 0 && (
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
          <Button onClick={handleSubmit} disabled={!checkType || (!isTrainingSelected && (!buildingId || !floorId))}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Complete Check
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={showPassConfirmation} onOpenChange={setShowPassConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Passed Training</DialogTitle>
            <DialogDescription>
              Confirm the certification date before adding or updating this certificate in H&S Certificates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-sm">
              <span className="font-medium">Course:</span> {trainingCourseLabel}
            </div>
            {trainingParticipantLabel && (
              <div className="text-sm">
                <span className="font-medium">Participant:</span> {trainingParticipantLabel}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pass-certification-date">Certification Date *</Label>
              <Input
                id="pass-certification-date"
                type="date"
                value={passCertificationDate}
                onChange={(event) => setPassCertificationDate(event.target.value)}
              />
            </div>

            {normalizedTrainingType ? (
              <div className="text-xs text-muted-foreground">
                Certificate Type: {CERTIFICATE_TYPE_LABELS[normalizedTrainingType]} · Validity: {trainingValidityYears} year{trainingValidityYears === 1 ? '' : 's'}
              </div>
            ) : (
              <div className="text-xs text-warning">
                This training type is not currently mapped to a certificate type. A certificate will not be created.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPassConfirmation(false)}>
              Back
            </Button>
            <Button
              onClick={() => {
                const certificationDate = parseCertificationDate();
                if (!certificationDate) {
                  toast.error(`Missing required field: Certification Date for ${trainingCourseLabel}.`);
                  return;
                }

                setShowPassConfirmation(false);
                handleSubmit({ skipPassConfirmation: true, certificationDate });
              }}
            >
              Confirm And Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
