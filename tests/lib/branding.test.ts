import { describe, expect, it } from 'vitest';
import { applyBranding } from '@/lib/branding';

describe('applyBranding', () => {
  it('updates title and metadata links from branding settings', () => {
    document.head.innerHTML = '';
    document.title = '';

    applyBranding({
      appName: 'Acme SafeOps',
      appShortName: 'SafeOps',
      appDescription: 'Corporate safety operations portal',
      themeColor: '#112233',
      backgroundColor: '#EDEDED',
      faviconUrl: '/acme-favicon.png',
      appleTouchIconUrl: '/acme-apple-touch.png',
      socialImageUrl: '/acme-social.png',
    });

    expect(document.title).toBe('Acme SafeOps');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Corporate safety operations portal',
    );
    expect(document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#112233');
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('/acme-social.png');
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/acme-favicon.png');
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('type')).toBe('image/png');
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe(
      '/acme-apple-touch.png',
    );

    const manifestHref = document.head.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? '';
    expect(manifestHref.startsWith('data:application/manifest+json,')).toBe(true);
  });
});
