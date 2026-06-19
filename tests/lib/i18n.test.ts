import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';

describe('i18n translation helper', () => {
  it('returns language specific labels for supported keys', () => {
    expect(t('english', 'nav_incidents')).toBe('Incidents');
    expect(t('spanish', 'nav_incidents')).toBe('Incidentes');
    expect(t('swahili', 'menu_language')).toBe('Lugha');
    expect(t('isizulu', 'menu_language')).toBe('Ulimi');
    expect(t('isixhosa', 'menu_language')).toBe('Ulwimi');
    expect(t('german', 'menu_language')).toBe('Sprache');
    expect(t('tamil', 'menu_language')).toBe('மொழி');
    expect(t('portuguese_brazil', 'menu_language')).toBe('Idioma');
    expect(t('portuguese_portugal', 'language_dialog_save')).toBe('Guardar Idioma');
    expect(t('chinese_simplified', 'menu_language')).toBe('语言');
    expect(t('chinese_traditional', 'menu_language')).toBe('語言');
    expect(t('japanese', 'menu_language')).toBe('言語');
    expect(t('korean', 'menu_language')).toBe('언어');
    expect(t('russian', 'menu_language')).toBe('Язык');
    expect(t('indonesian', 'menu_language')).toBe('Bahasa');
    expect(t('bengali', 'menu_language')).toBe('ভাষা');
    expect(t('urdu', 'menu_language')).toBe('زبان');
    expect(t('turkish', 'menu_language')).toBe('Dil');
    expect(t('vietnamese', 'menu_language')).toBe('Ngôn ngữ');
    expect(t('persian', 'menu_language')).toBe('زبان');
    expect(t('punjabi', 'menu_language')).toBe('ਭਾਸ਼ਾ');
    expect(t('swedish', 'menu_language')).toBe('Språk');
    expect(t('norwegian', 'menu_language')).toBe('Språk');
    expect(t('finnish', 'menu_language')).toBe('Kieli');
    expect(t('dutch', 'menu_language')).toBe('Taal');
    expect(t('estonian', 'menu_language')).toBe('Keel');
    expect(t('danish', 'menu_language')).toBe('Sprog');
  });

  it('falls back to english when translation key is missing in a language', () => {
    expect(t('afrikaans', 'nav_dashboard')).toBe('Dashboard');
  });
});
