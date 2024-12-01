import { Templates } from "./types"

export function templatesToPrompt(templates: Templates) {
  return `${Object.entries(templates)
    .map(
      ([id, t], index) =>
        `${index + 1}. ${id}: "${t.instructions}". File: ${t.file || "none"}. Dependencies installed: ${t.lib.join(", ")}. Port: ${t.port || "none"}.`
    )
    .join("\n")}`
}
