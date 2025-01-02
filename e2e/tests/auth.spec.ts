import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[type="email"]', 'pentestgptdevfreepub.glorified188@passinbox.com')
    await page.fill('input[type="password"]', 'Copartner5-Enticing8-Freckled5-Clubbed6')
    await page.waitForTimeout(3000) // Wait for captcha
    await page.getByTestId('login-button').click()

    // Check if redirected to chat
    await expect(page).toHaveURL('/1e701569-c6ef-4e0f-b107-d28ddf4c739e/chat')
  })

}) 