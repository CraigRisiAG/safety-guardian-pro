import { expect, test } from '@playwright/test';

const AUTH_USER = {
  id: 'admin-1',
  name: 'Safety Officer',
  email: 'safety@example.com',
  role: 'admin',
};

const routes = [
  '/',
  '/incidents',
  '/drills',
  '/check-in',
  '/health-official-gaps',
  '/admin',
  '/chat',
  '/login',
];

const routeToSlug = (route: string) => {
  if (route === '/') {
    return 'dashboard';
  }

  return route.replace(/^\//, '').replace(/[^a-z0-9-]+/gi, '-');
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', 'visual-test-token');
  }, AUTH_USER);
});

for (const route of routes) {
  test(`responsive visual snapshot: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    // Ensure the page itself does not create horizontal overflow on any viewport.
    const hasHorizontalOverflow = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      return body.scrollWidth > window.innerWidth + 1 || root.scrollWidth > window.innerWidth + 1;
    });

    expect(hasHorizontalOverflow).toBeFalsy();
    await expect(page).toHaveScreenshot(`${routeToSlug(route)}.png`, { fullPage: true });
  });
}
