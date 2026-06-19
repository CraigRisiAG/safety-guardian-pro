import { useEffect, useMemo, useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { BrandingSettings as BrandingSettingsType, DEFAULT_BRANDING_SETTINGS } from '@/types/admin';

interface BrandingSettingsProps {
  settings: BrandingSettingsType;
  onSave: (updates: Partial<BrandingSettingsType>) => void;
}

export function BrandingSettings({ settings, onSave }: BrandingSettingsProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<BrandingSettingsType>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const previewName = useMemo(() => draft.appName.trim() || DEFAULT_BRANDING_SETTINGS.appName, [draft.appName]);

  const updateField = <K extends keyof BrandingSettingsType>(field: K, value: BrandingSettingsType[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(draft);
    toast({
      title: 'Branding updated',
      description: 'Your app title, icons, and metadata have been updated.',
    });
  };

  const handleReset = () => {
    setDraft(DEFAULT_BRANDING_SETTINGS);
    onSave(DEFAULT_BRANDING_SETTINGS);
    toast({
      title: 'Branding reset',
      description: 'Branding settings were restored to defaults.',
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Corporate Branding
        </CardTitle>
        <CardDescription>
          Customize app identity for each company. Changes apply immediately to title, icon links, and metadata.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-app-name">Application Name</Label>
            <Input
              id="branding-app-name"
              value={draft.appName}
              onChange={(event) => updateField('appName', event.target.value)}
              placeholder="Safety Guardian"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branding-short-name">Short Name</Label>
            <Input
              id="branding-short-name"
              value={draft.appShortName}
              onChange={(event) => updateField('appShortName', event.target.value)}
              placeholder="Safety"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branding-description">Description</Label>
          <Textarea
            id="branding-description"
            value={draft.appDescription}
            onChange={(event) => updateField('appDescription', event.target.value)}
            placeholder="Short description used for search and social cards"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-theme-color">Theme Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="branding-theme-color"
                type="color"
                value={draft.themeColor}
                onChange={(event) => updateField('themeColor', event.target.value)}
                className="w-16 p-1"
              />
              <Input
                value={draft.themeColor}
                onChange={(event) => updateField('themeColor', event.target.value)}
                placeholder="#0B3C5D"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branding-background-color">Background Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="branding-background-color"
                type="color"
                value={draft.backgroundColor}
                onChange={(event) => updateField('backgroundColor', event.target.value)}
                className="w-16 p-1"
              />
              <Input
                value={draft.backgroundColor}
                onChange={(event) => updateField('backgroundColor', event.target.value)}
                placeholder="#F7F9FB"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branding-favicon">Favicon URL</Label>
            <Input
              id="branding-favicon"
              value={draft.faviconUrl}
              onChange={(event) => updateField('faviconUrl', event.target.value)}
              placeholder="/favicon.svg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branding-apple-icon">Apple Touch Icon URL</Label>
            <Input
              id="branding-apple-icon"
              value={draft.appleTouchIconUrl}
              onChange={(event) => updateField('appleTouchIconUrl', event.target.value)}
              placeholder="/apple-touch-icon.png"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branding-social-image">Social Share Image URL</Label>
          <Input
            id="branding-social-image"
            value={draft.socialImageUrl}
            onChange={(event) => updateField('socialImageUrl', event.target.value)}
            placeholder="/android-chrome-512x512.png"
          />
        </div>

        <div className="rounded-md border p-3">
          <p className="text-sm font-medium">Live Preview</p>
          <p className="text-xs text-muted-foreground mt-1">{previewName}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border"
              style={{ backgroundColor: draft.themeColor }}
              aria-label="Theme color preview"
            />
            <span className="text-xs text-muted-foreground">Theme color</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave}>Save Branding</Button>
          <Button type="button" variant="outline" onClick={handleReset}>Reset to Default</Button>
        </div>
      </CardContent>
    </Card>
  );
}
