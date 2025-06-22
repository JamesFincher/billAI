import { test, expect } from '@playwright/test';

test.describe('BillAI - Basic UI Tests', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check that the main heading is visible
    await expect(page.locator('h1')).toContainText('Smart Billing');
    await expect(page.locator('h1')).toContainText('Made Simple');
    
    // Check that navigation elements are present - use more specific selector
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav span').first()).toContainText('BillAI');
    
    // Check that call-to-action buttons are present
    await expect(page.locator('text=Get Started Free')).toBeVisible();
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('navigation to dashboard works', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Click on "Get Started Free" button and wait for navigation
    await Promise.all([
      page.waitForURL(/.*dashboard.*/),
      page.click('text=Get Started Free')
    ]);
    
    // Should navigate to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('navigation to auth works', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Click on "Sign In" button and wait for navigation
    await Promise.all([
      page.waitForURL(/.*auth.*/),
      page.click('text=Sign In')
    ]);
    
    // Should navigate to auth page
    await expect(page).toHaveURL(/.*auth.*/);
  });

  test('responsive design - mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001');
    
    // Check that content is still visible on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that buttons container exists
    await expect(page.locator('.flex.flex-col')).toBeVisible();
  });

  test('feature cards are visible', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check that feature cards are present - use heading role for more specificity
    await expect(page.getByRole('heading', { name: 'AI-Powered Insights' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Smart Analytics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Automated Payments' })).toBeVisible();
    
    // Check that feature descriptions are present
    await expect(page.locator('text=Get intelligent recommendations')).toBeVisible();
    await expect(page.locator('text=Visualize your spending')).toBeVisible();
    await expect(page.locator('text=Set up automatic bill payments')).toBeVisible();
  });

  test('footer is present', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Check footer content - use more specific selectors
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('footer').locator('text=© 2024 BillAI')).toBeVisible();
    await expect(page.locator('footer').locator('text=Built with ❤️')).toBeVisible();
  });

  test('page has correct title and meta', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check page title
    await expect(page).toHaveTitle(/BillAI/);
    
    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /Intelligent billing/);
  });
}); 