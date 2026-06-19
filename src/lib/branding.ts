import { BrandingSettings, DEFAULT_BRANDING_SETTINGS } from '@/types/admin';

const ensureMeta = (name: string, attribute: 'name' | 'property') => {
  const selector = `meta[${attribute}="${name}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  return tag;
};

const ensureLink = (rel: string) => {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  return link;
};

const getIconType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.ico')) {
    return 'image/x-icon';
  }
  return 'image/svg+xml';
};

export const applyBranding = (branding?: BrandingSettings) => {
  if (typeof document === 'undefined') {
    return;
  }

  const next = { ...DEFAULT_BRANDING_SETTINGS, ...(branding ?? {}) };
  document.title = next.appName;

  ensureMeta('description', 'name').setAttribute('content', next.appDescription);
  ensureMeta('author', 'name').setAttribute('content', next.appName);
  ensureMeta('theme-color', 'name').setAttribute('content', next.themeColor);

  ensureMeta('og:title', 'property').setAttribute('content', next.appName);
  ensureMeta('og:description', 'property').setAttribute('content', next.appDescription);
  ensureMeta('og:image', 'property').setAttribute('content', next.socialImageUrl);

  ensureMeta('twitter:image', 'name').setAttribute('content', next.socialImageUrl);

  const icon = ensureLink('icon');
  icon.setAttribute('type', getIconType(next.faviconUrl));
  icon.setAttribute('href', next.faviconUrl);

  const fallback = ensureLink('alternate icon');
  fallback.setAttribute('href', '/favicon.ico');

  ensureLink('apple-touch-icon').setAttribute('href', next.appleTouchIconUrl);

  const manifest = {
    name: next.appName,
    short_name: next.appShortName,
    description: next.appDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: next.themeColor,
    background_color: next.backgroundColor,
    icons: [
      { src: next.appleTouchIconUrl, sizes: '180x180', type: 'image/png' },
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: next.faviconUrl, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };

  const manifestHref = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
  ensureLink('manifest').setAttribute('href', manifestHref);
};
