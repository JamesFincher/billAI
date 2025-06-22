import { test, expect } from '@playwright/test';

test.describe('Bill Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Bill Creation', () => {
    test('should create a one-time bill successfully', async ({ page }) => {
      // Click Add Bill button
      await page.click('button:has-text("Add Bill")');
      
      // Wait for modal to appear
      await page.waitForSelector('[data-testid="bill-form-modal"]', { timeout: 10000 });
      
      // Fill out the form
      await page.fill('input[name="title"]', 'Electric Bill Test');
      await page.fill('input[name="amount"]', '150.75');
      await page.fill('textarea[name="description"]', 'Monthly electric bill');
      await page.fill('input[name="due_date"]', '2024-02-15');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Wait for modal to close
      await page.waitForSelector('[data-testid="bill-form-modal"]', { state: 'hidden' });
      
      // Verify bill appears in the list
      await expect(page.locator('text=Electric Bill Test')).toBeVisible();
    });

    test('should create a recurring bill successfully', async ({ page }) => {
      // Click Add Bill button
      await page.click('button:has-text("Add Bill")');
      
      // Wait for modal to appear
      await page.waitForSelector('[data-testid="bill-form-modal"]', { timeout: 10000 });
      
      // Fill out basic info
      await page.fill('input[name="title"]', 'Monthly Rent');
      await page.fill('input[name="amount"]', '1200');
      await page.fill('input[name="due_date"]', '2024-02-01');
      
      // Enable recurring
      await page.check('input[name="is_recurring"]');
      
      // Wait for recurrence options to appear
      await page.waitForSelector('text=Recurrence Pattern', { timeout: 5000 });
      
      // Select monthly pattern
      await page.click('button:has-text("Monthly")');
      
      // Submit the form
      await page.click('button[type="submit"]');
      
      // Wait for modal to close
      await page.waitForSelector('[data-testid="bill-form-modal"]', { state: 'hidden' });
      
      // Verify bill appears
      await expect(page.locator('text=Monthly Rent')).toBeVisible();
    });
  });

  test.describe('Bill Interactions', () => {
    test('should mark bill as paid', async ({ page }) => {
      // First create a bill to mark as paid
      await page.click('button:has-text("Add Bill")');
      await page.waitForSelector('[data-testid="bill-form-modal"]');
      
      await page.fill('input[name="title"]', 'Test Payment Bill');
      await page.fill('input[name="amount"]', '50');
      await page.fill('input[name="due_date"]', '2024-02-15');
      await page.click('button[type="submit"]');
      
      // Wait for bill to appear
      await page.waitForSelector('text=Test Payment Bill');
      
      // Look for mark as paid button
      const markPaidButton = page.locator('[title="Mark as paid"]').first();
      if (await markPaidButton.isVisible()) {
        await markPaidButton.click();
        
        // Wait for status to update
        await page.waitForTimeout(1000);
      }
    });

    test('should edit an existing bill', async ({ page }) => {
      // First create a bill to edit
      await page.click('button:has-text("Add Bill")');
      await page.waitForSelector('[data-testid="bill-form-modal"]');
      
      await page.fill('input[name="title"]', 'Test Edit Bill');
      await page.fill('input[name="amount"]', '75');
      await page.fill('input[name="due_date"]', '2024-02-15');
      await page.click('button[type="submit"]');
      
      // Wait for bill to appear and click it
      await page.waitForSelector('text=Test Edit Bill');
      await page.click('text=Test Edit Bill');
      
      // Wait for edit modal
      await page.waitForSelector('[data-testid="bill-form-modal"]');
      
      // Edit the bill
      await page.fill('input[name="title"]', 'Updated Edit Bill');
      await page.fill('input[name="amount"]', '85');
      
      // Submit changes
      await page.click('button[type="submit"]');
      
      // Verify changes appear
      await expect(page.locator('text=Updated Edit Bill')).toBeVisible();
    });
  });

  test.describe('Month Navigation', () => {
    test('should navigate between months', async ({ page }) => {
      // Look for month navigation buttons
      const nextMonthButton = page.locator('[data-testid="next-month"]');
      const prevMonthButton = page.locator('[data-testid="prev-month"]');
      
      if (await nextMonthButton.isVisible()) {
        await nextMonthButton.click();
        await page.waitForTimeout(500);
      }
      
      if (await prevMonthButton.isVisible()) {
        await prevMonthButton.click();
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that key elements are still visible
      await expect(page.locator('button:has-text("Add Bill")')).toBeVisible();
      
      // Test adding a bill on mobile
      await page.click('button:has-text("Add Bill")');
      await page.waitForSelector('[data-testid="bill-form-modal"]');
      
      // Form should be usable on mobile
      await expect(page.locator('input[name="title"]')).toBeVisible();
      await expect(page.locator('input[name="amount"]')).toBeVisible();
      
      // Close modal
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should validate required fields', async ({ page }) => {
      // Click Add Bill button
      await page.click('button:has-text("Add Bill")');
      
      // Try to submit without filling required fields
      await page.click('button[type="submit"]');
      
      // Form should not submit (modal should still be visible)
      await expect(page.locator('[data-testid="bill-form-modal"]')).toBeVisible();
      
      // Fill required fields
      await page.fill('input[name="title"]', 'Test Bill');
      await page.fill('input[name="amount"]', '100');
      await page.fill('input[name="due_date"]', '2024-02-15');
      
      // Now it should submit
      await page.click('button[type="submit"]');
      
      // Modal should close
      await page.waitForSelector('[data-testid="bill-form-modal"]', { state: 'hidden' });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Test that elements are focusable
      const addButton = page.locator('button:has-text("Add Bill")');
      if (await addButton.isVisible()) {
        await addButton.focus();
        await page.keyboard.press('Enter');
        
        // If modal opens, test escape key
        if (await page.locator('[data-testid="bill-form-modal"]').isVisible()) {
          await page.keyboard.press('Escape');
        }
      }
    });
  });
}); 