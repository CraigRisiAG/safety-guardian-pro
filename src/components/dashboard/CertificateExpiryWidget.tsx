import { useMemo } from 'react';
import { Award, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCertificates } from '@/hooks/useCertificates';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import { format, differenceInDays } from 'date-fns';

export function CertificateExpiryWidget() {
  const { certificates, expiringSoon, expired } = useCertificates();

  const validCount = useMemo(() =>
    certificates.filter(c => {
      const now = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return c.expiryDate > threeMonths;
    }).length,
    [certificates]
  );

  if (certificates.length === 0) return null;

  const alertItems = [...expired, ...expiringSoon];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="w-5 h-5 text-primary" />
          H&S Certificates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-safe-muted rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-safe">{validCount}</div>
            <div className="text-[10px] text-muted-foreground">Valid</div>
          </div>
          <div className={`rounded-lg p-2 text-center ${expiringSoon.length > 0 ? 'bg-warning-muted' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold ${expiringSoon.length > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              {expiringSoon.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Expiring Soon</div>
          </div>
          <div className={`rounded-lg p-2 text-center ${expired.length > 0 ? 'bg-emergency-muted' : 'bg-muted/50'}`}>
            <div className={`text-lg font-bold ${expired.length > 0 ? 'text-emergency' : 'text-muted-foreground'}`}>
              {expired.length}
            </div>
            <div className="text-[10px] text-muted-foreground">Expired</div>
          </div>
        </div>

        {/* Alert items */}
        {alertItems.length > 0 && (
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-2">
              {alertItems.map(cert => {
                const isExpired = cert.expiryDate <= new Date();
                const daysUntil = differenceInDays(cert.expiryDate, new Date());
                
                return (
                  <div
                    key={cert.id}
                    className={`p-2.5 rounded-lg border text-sm ${
                      isExpired 
                        ? 'bg-emergency-muted/50 border-emergency/30' 
                        : 'bg-warning-muted/50 border-warning/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpired ? (
                          <XCircle className="w-3.5 h-3.5 text-emergency shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                        )}
                        <span className="font-medium truncate">{cert.userName}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${
                        isExpired ? 'text-emergency border-emergency/50' : 'text-warning border-warning/50'
                      }`}>
                        {isExpired ? 'Expired' : `${daysUntil}d left`}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>{CERTIFICATE_TYPE_LABELS[cert.certificateType]}</span>
                      <span>Expires {format(cert.expiryDate, 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {alertItems.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-safe p-2 bg-safe-muted/50 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            All certificates are valid
          </div>
        )}
      </CardContent>
    </Card>
  );
}
