import { useState, useMemo } from 'react';
import { Award, Plus, Trash2, Edit2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCertificates } from '@/hooks/useCertificates';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { CertificateType, CERTIFICATE_TYPE_LABELS, isCertificateExpiringSoon, isCertificateExpired } from '@/types/certificates';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function CertificateManager() {
  const {
    certificates,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    certificateValidityYearsByType,
    updateCertificateValidityYears,
  } = useCertificates();
  const { settings } = useAdminSettings();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCert, setEditingCert] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    userId: '',
    certificateType: 'fire_marshall' as CertificateType,
    certificationDate: new Date(),
    certificateNumber: '',
    issuedBy: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      userId: '',
      certificateType: 'fire_marshall',
      certificationDate: new Date(),
      certificateNumber: '',
      issuedBy: '',
      notes: '',
    });
    setEditingCert(null);
  };

  const handleSubmit = () => {
    const user = settings.userPermissions.find(p => p.id === formData.userId);
    if (!user) {
      toast.error('Please select a user');
      return;
    }

    if (editingCert) {
      updateCertificate(editingCert, {
        certificateType: formData.certificateType,
        certificationDate: formData.certificationDate,
        certificateNumber: formData.certificateNumber || undefined,
        issuedBy: formData.issuedBy || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Certificate updated');
    } else {
      addCertificate({
        userId: user.id,
        userName: user.userName,
        email: user.email,
        certificateType: formData.certificateType,
        certificationDate: formData.certificationDate,
        certificateNumber: formData.certificateNumber || undefined,
        issuedBy: formData.issuedBy || undefined,
        notes: formData.notes || undefined,
      });
      toast.success('Certificate added');
    }

    resetForm();
    setShowAddDialog(false);
  };

  const handleEdit = (certId: string) => {
    const cert = certificates.find(c => c.id === certId);
    if (!cert) return;
    setFormData({
      userId: cert.userId,
      certificateType: cert.certificateType,
      certificationDate: cert.certificationDate,
      certificateNumber: cert.certificateNumber || '',
      issuedBy: cert.issuedBy || '',
      notes: cert.notes || '',
    });
    setEditingCert(certId);
    setShowAddDialog(true);
  };

  const filteredCerts = useMemo(() => {
    if (filterType === 'all') return certificates;
    if (filterType === 'expiring') return certificates.filter(c => isCertificateExpiringSoon(c.expiryDate));
    if (filterType === 'expired') return certificates.filter(c => isCertificateExpired(c.expiryDate));
    return certificates.filter(c => c.certificateType === filterType);
  }, [certificates, filterType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">H&S Certificates</h3>
          <p className="text-sm text-muted-foreground">Track safety certification validity (3-year expiry)</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Certificate
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'expiring', 'expired', ...Object.keys(CERTIFICATE_TYPE_LABELS)].map(f => (
          <Button
            key={f}
            variant={filterType === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(f)}
          >
            {f === 'all' ? 'All' : f === 'expiring' ? 'Expiring Soon' : f === 'expired' ? 'Expired' : CERTIFICATE_TYPE_LABELS[f as CertificateType]}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Certificate Validity Settings</h4>
          <p className="text-xs text-muted-foreground">
            Configure expiry periods per certificate type. Existing certificates update automatically.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(CERTIFICATE_TYPE_LABELS) as CertificateType[]).map((type) => (
            <div key={type} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="text-sm font-medium">{CERTIFICATE_TYPE_LABELS[type]}</div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`validity-${type}`} className="text-xs text-muted-foreground">Years</Label>
                <Input
                  id={`validity-${type}`}
                  type="number"
                  min={1}
                  max={10}
                  value={certificateValidityYearsByType[type]}
                  onChange={(event) => {
                    const nextYears = Number(event.target.value);
                    if (Number.isFinite(nextYears) && nextYears >= 1) {
                      updateCertificateValidityYears(type, nextYears);
                    }
                  }}
                  className="w-20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate List */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-3">
          {filteredCerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No certificates found</div>
          ) : (
            filteredCerts.map(cert => {
              const isExpired = isCertificateExpired(cert.expiryDate);
              const isExpiring = isCertificateExpiringSoon(cert.expiryDate);

              return (
                <div key={cert.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isExpired ? 'bg-emergency-muted' : isExpiring ? 'bg-warning-muted' : 'bg-safe-muted'
                    }`}>
                      {isExpired ? <XCircle className="w-5 h-5 text-emergency" /> :
                       isExpiring ? <AlertTriangle className="w-5 h-5 text-warning" /> :
                       <CheckCircle2 className="w-5 h-5 text-safe" />}
                    </div>
                    <div>
                      <div className="font-medium">{cert.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {CERTIFICATE_TYPE_LABELS[cert.certificateType]}
                        {cert.certificateNumber && ` • #${cert.certificateNumber}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Certified: {format(cert.certificationDate, 'dd MMM yyyy')} → Expires: {format(cert.expiryDate, 'dd MMM yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      isExpired ? 'text-emergency border-emergency/50' :
                      isExpiring ? 'text-warning border-warning/50' :
                      'text-safe border-safe/50'
                    }>
                      {isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Valid'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cert.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      deleteCertificate(cert.id);
                      toast.success('Certificate removed');
                    }}>
                      <Trash2 className="w-4 h-4 text-emergency" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {editingCert ? 'Edit Certificate' : 'Add Certificate'}
            </DialogTitle>
            <DialogDescription>
              Certificates expire according to the configured validity for the selected certificate type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Personnel *</Label>
              <Select value={formData.userId} onValueChange={v => setFormData(prev => ({ ...prev, userId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person..." />
                </SelectTrigger>
                <SelectContent>
                  {settings.userPermissions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.userName} ({p.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Certificate Type *</Label>
              <Select value={formData.certificateType} onValueChange={v => setFormData(prev => ({ ...prev, certificateType: v as CertificateType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CERTIFICATE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Certification Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    {format(formData.certificationDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.certificationDate}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, certificationDate: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Expires: {format(
                  new Date(
                    formData.certificationDate.getFullYear() + (certificateValidityYearsByType[formData.certificateType] || 3),
                    formData.certificationDate.getMonth(),
                    formData.certificationDate.getDate(),
                  ),
                  'dd MMM yyyy',
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Certificate Number</Label>
                <Input value={formData.certificateNumber} onChange={e => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Issued By</Label>
                <Input value={formData.issuedBy} onChange={e => setFormData(prev => ({ ...prev, issuedBy: e.target.value }))} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.userId}>
              {editingCert ? 'Update' : 'Add'} Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
