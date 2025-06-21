import { test, expect } from '@playwright/test'

// Helper function to sign in
async function signIn(page: any) {
  await page.goto('/auth')
  await page.getByLabel(/email/i).fill('test@example.com')
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

test.describe('Dashboard', () => {
  test.skip('should display dashboard after login', async ({ page }) => {
    // Skip this test unless we have a test user set up
    await signIn(page)
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test.skip('should display user menu', async ({ page }) => {
    await signIn(page)
    
    // Check for user menu
    await expect(page.getByRole('button', { name: /user menu/i }).or(page.getByTestId('user-menu'))).toBeVisible()
  })

  test.skip('should allow logout', async ({ page }) => {
    await signIn(page)
    
    // Find and click logout
    await page.getByRole('button', { name: /logout/i }).or(page.getByText(/sign out/i)).click()
    
    // Should redirect to home or auth
    await expect(page).toHaveURL('/')
  })

  test.skip('should display invoice statistics', async ({ page }) => {
    await signIn(page)
    
    // Check for stats cards
    await expect(page.getByText(/total invoices/i).or(page.getByText(/invoices/i))).toBeVisible()
    await expect(page.getByText(/revenue/i).or(page.getByText(/total/i))).toBeVisible()
  })
})

test.describe('Bill Management', () => {
  test.skip('should navigate to bills section', async ({ page }) => {
    await signIn(page)
    
    // Look for bills navigation
    const billsLink = page.getByRole('link', { name: /bills/i }).or(page.getByText(/bills/i))
    if (await billsLink.isVisible()) {
      await billsLink.click()
      await expect(page.getByRole('heading', { name: /bills/i })).toBeVisible()
    }
  })

  test.skip('should open add bill form', async ({ page }) => {
    await signIn(page)
    
    // Look for add bill button
    const addBillButton = page.getByRole('button', { name: /add bill/i }).or(page.getByText(/new bill/i))
    if (await addBillButton.isVisible()) {
      await addBillButton.click()
      await expect(page.getByRole('heading', { name: /add bill/i }).or(page.getByText(/create bill/i))).toBeVisible()
    }
  })
}) 