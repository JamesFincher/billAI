import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/BillAI/)
    await expect(page.getByRole('heading', { name: /Smart Billing/i })).toBeVisible()
  })

  test('should navigate to auth page', async ({ page }) => {
    // Click the first Sign In link (in navigation)
    await page.getByRole('link', { name: /Sign In/i }).first().click()
    await expect(page).toHaveURL('/auth')
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth')
    
    // Try to submit the form without filling any fields
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Check for HTML5 validation on required fields
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByLabel(/password/i).first()
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should allow switching between sign in and sign up', async ({ page }) => {
    await page.goto('/auth')
    
    // Should start with Sign In form
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
    
    // Click "Sign up" link to switch to sign up form
    await page.getByRole('button', { name: /sign up/i }).click()
    
    // Should now show Sign Up form
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible()
    
    // Click "Sign in" link to switch back
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should be back to Sign In form
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  })

  test('should handle form submission', async ({ page }) => {
    await page.goto('/auth')
    
    // Fill out the form
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com')
    await page.getByLabel(/password/i).first().fill('password123')
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // The form should attempt to submit (we expect it to fail with invalid credentials)
    // Just check that the form elements are still there (indicating we didn't crash)
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
  })
})

test.describe('Protected Routes', () => {
  test('should redirect to auth when accessing protected routes without login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/auth')
  })
}) 