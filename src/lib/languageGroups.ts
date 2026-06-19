import { SystemLanguage } from '@/types/admin';

export interface LanguageGroup {
  id: string;
  label: string;
  languages: SystemLanguage[];
}

const GROUP_DEFINITIONS: LanguageGroup[] = [
  {
    id: 'core',
    label: 'Core Global',
    languages: ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'portuguese_brazil', 'portuguese_portugal', 'dutch'],
  },
  {
    id: 'africa',
    label: 'Africa',
    languages: ['afrikaans', 'swahili', 'isizulu', 'isixhosa'],
  },
  {
    id: 'east_asia',
    label: 'East Asia',
    languages: ['mandarin', 'chinese_simplified', 'chinese_traditional', 'japanese', 'korean'],
  },
  {
    id: 'south_asia',
    label: 'South Asia',
    languages: ['hindi', 'tamil', 'urdu', 'bengali', 'punjabi'],
  },
  {
    id: 'middle_east',
    label: 'Middle East',
    languages: ['arabic', 'persian', 'turkish'],
  },
  {
    id: 'europe_nordic_baltic',
    label: 'Nordic and Baltic',
    languages: ['swedish', 'norwegian', 'finnish', 'danish', 'estonian'],
  },
  {
    id: 'southeast_asia',
    label: 'Southeast Asia',
    languages: ['indonesian', 'vietnamese'],
  },
  {
    id: 'other',
    label: 'Other',
    languages: [],
  },
];

export const groupLanguages = (availableLanguages: SystemLanguage[]): LanguageGroup[] => {
  const availableSet = new Set<SystemLanguage>(availableLanguages);
  const consumed = new Set<SystemLanguage>();

  const grouped = GROUP_DEFINITIONS.map((group) => {
    if (group.id === 'other') {
      return { ...group, languages: [] as SystemLanguage[] };
    }

    const languages = group.languages.filter((language) => availableSet.has(language));
    languages.forEach((language) => consumed.add(language));
    return { ...group, languages };
  });

  const otherGroup = grouped.find((group) => group.id === 'other');
  if (otherGroup) {
    otherGroup.languages = availableLanguages.filter((language) => !consumed.has(language));
  }

  return grouped.filter((group) => group.languages.length > 0);
};
