import { Languages } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFAULT_SUPPORTED_LANGUAGES,
  SYSTEM_LANGUAGE_LABELS,
  SystemLanguage,
} from '@/types/admin';

interface LanguageSettingsProps {
  supportedLanguages: SystemLanguage[];
  defaultLanguage: SystemLanguage;
  onSupportedLanguagesChange: (languages: SystemLanguage[]) => void;
  onDefaultLanguageChange: (language: SystemLanguage) => void;
}

export function LanguageSettings({
  supportedLanguages,
  defaultLanguage,
  onSupportedLanguagesChange,
  onDefaultLanguageChange,
}: LanguageSettingsProps) {
  const enabledSet = new Set(supportedLanguages);

  const toggleLanguage = (language: SystemLanguage) => {
    if (enabledSet.has(language)) {
      const next = supportedLanguages.filter((entry) => entry !== language);
      if (next.length > 0) {
        onSupportedLanguagesChange(next);
      }
      return;
    }

    const next = [...supportedLanguages, language].sort(
      (left, right) => DEFAULT_SUPPORTED_LANGUAGES.indexOf(left) - DEFAULT_SUPPORTED_LANGUAGES.indexOf(right),
    );
    onSupportedLanguagesChange(next);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="w-5 h-5" />
          Language Support
        </CardTitle>
        <CardDescription>
          Configure which application languages are available and choose a default language.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Default Language</Label>
          <Select
            value={defaultLanguage}
            onValueChange={(value) => onDefaultLanguageChange(value as SystemLanguage)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select default language" />
            </SelectTrigger>
            <SelectContent>
              {supportedLanguages.map((language) => (
                <SelectItem key={language} value={language}>
                  {SYSTEM_LANGUAGE_LABELS[language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">This language is used as the system fallback.</p>
        </div>

        <div className="space-y-2">
          <Label>Supported Languages</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3">
            {DEFAULT_SUPPORTED_LANGUAGES.map((language) => (
              <div key={language} className="flex items-center space-x-2">
                <Checkbox
                  id={`language-${language}`}
                  checked={enabledSet.has(language)}
                  onCheckedChange={() => toggleLanguage(language)}
                />
                <label htmlFor={`language-${language}`} className="text-sm cursor-pointer">
                  {SYSTEM_LANGUAGE_LABELS[language]}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">At least one language must remain enabled.</p>
        </div>
      </CardContent>
    </Card>
  );
}
