import { test, expect } from "@playwright/test"

if (process.env.E2E_TESTS === "true") {
  test.describe("Authentication Flow", () => {
    test("should login successfully with valid credentials", async ({
      page
    }) => {
      await page.goto("/login")

      await page.fill('input[type="email"]', process.env.TEST_AUTH_EMAIL || "")
      await page.fill(
        'input[type="password"]',
        process.env.TEST_AUTH_PASSWORD || ""
      )
      await page.waitForTimeout(3000) // Wait for captcha
      await page.getByTestId("login-button").click()

      // Check if redirected to chat
      await expect(page).toHaveURL(/.*\/c/)
    })

    test("should show email verification message after signup request", async ({
      page
    }) => {
      await page.goto("/login")

      // Fill in signup form
      await page.fill('input[type="email"]', process.env.TEST_AUTH_EMAIL || "")
      await page.fill('input[type="password"]', "Test123!@#Password")
      await page.waitForTimeout(3000) // Wait for captcha
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
      await page.fill('input[type="email"]', process.env.TEST_AUTH_EMAIL || "")
      await page.waitForTimeout(3000) // Wait for captcha
      await page.getByTestId("reset-password-button").click()

      // Check for verification message
      const successMessage = await page.getByText(
        "Password reset email sent. Check your email to continue."
      )
      await expect(successMessage).toBeVisible()
    })
  })
} else {
  test.skip("Authentication Flow (skipped - E2E tests disabled)", () => {})
}
