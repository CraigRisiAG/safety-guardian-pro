import { describe, expect, it } from 'vitest';
import { groupLanguages } from '@/lib/languageGroups';

describe('groupLanguages', () => {
  it('keeps variants grouped under regional buckets', () => {
    const grouped = groupLanguages([
      'english',
      'portuguese_brazil',
      'portuguese_portugal',
      'chinese_simplified',
      'chinese_traditional',
      'swedish',
    ]);

    expect(grouped.map((group) => group.label)).toEqual(['Core Global', 'East Asia', 'Nordic and Baltic']);
    expect(grouped[0].languages).toEqual(['english', 'portuguese_brazil', 'portuguese_portugal']);
    expect(grouped[1].languages).toEqual(['chinese_simplified', 'chinese_traditional']);
    expect(grouped[2].languages).toEqual(['swedish']);
  });

  it('places unknown future languages in Other', () => {
    const grouped = groupLanguages(['english', 'danish']);

    expect(grouped.find((group) => group.id === 'other')).toBeUndefined();
  });
});
