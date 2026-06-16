import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n translation helper', () => {
  it('returns language specific labels for supported keys', () => {
    expect(t('english', 'nav_incidents')).toBe('Incidents');
    expect(t('spanish', 'nav_incidents')).toBe('Incidentes');
    expect(t('swahili', 'menu_language')).toBe('Lugha');
    expect(t('isizulu', 'menu_language')).toBe('Ulimi');
    expect(t('isixhosa', 'menu_language')).toBe('Ulwimi');
  });

  it('falls back to english when translation key is missing in a language', () => {
    expect(t('afrikaans', 'nav_dashboard')).toBe('Dashboard');
  });
});
