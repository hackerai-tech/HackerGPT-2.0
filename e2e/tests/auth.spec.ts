import { test, expect } from "@playwright/test"

test.describe("Authentication Flow", () => {
  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.fill(
      'input[type="email"]',
      "pentestgptdevfreepub.glorified188@passinbox.com"
    )
    await page.fill(
      'input[type="password"]',
      "Copartner5-Enticing8-Freckled5-Clubbed6"
    )
    await page.waitForTimeout(2000) // Wait for captcha
    await page.getByTestId("login-button").click()

    // Check if redirected to chat
    await expect(page).toHaveURL("/1e701569-c6ef-4e0f-b107-d28ddf4c739e/chat")
  })

  test("should show email verification message after signup request", async ({
    page
  }) => {
    await page.goto("/login")

    // Fill in signup form
    await page.fill('input[type="email"]', "test@example.com")
    await page.fill('input[type="password"]', "Test123!@#Password")
    await page.waitForTimeout(2000) // Wait for captcha
    await page.getByTestId("signup-button").click()

    // Check for verification message
    const successMessage = await page.getByText(
      "Check your email to continue the sign-in process."
    )
    await expect(successMessage).toBeVisible()
  })

  test("should show email verification message after reset password request", async ({
    page
  }) => {
    await page.goto("/login")

    // Fill in signup form
    await page.fill('input[type="email"]', "test@example.com")
    await page.waitForTimeout(2000) // Wait for captcha
    await page.getByTestId("reset-password-button").click()

    // Check for verification message
    const successMessage = await page.getByText(
      "Password reset email sent. Check your email to continue."
    )
    await expect(successMessage).toBeVisible()
  })
})
