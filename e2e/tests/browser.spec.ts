import { test, expect } from "@playwright/test"
import { browsePage } from "@/lib/tools/llm/browser"

if (process.env.E2E_TESTS === "true") {
  test.describe("Browser Tool", () => {
    test("browsePage should fetch content from pentestgpt.ai", async () => {
      if (process.env.JINA_API_TOKEN) {
        const result = await browsePage("pentestgpt.ai")
        expect(result).toContain(
          "[Start Chatting](https://pentestgpt.ai/login)"
        )
        expect(result).toContain("PentestGPT")
      } else {
        console.log("Skipping test - JINA_API_TOKEN not set")
        test.skip()
      }
    })
  })
} else {
  test.skip("Browser Tool (skipped - E2E tests disabled)", () => {})
}
