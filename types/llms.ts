import { ModelProvider } from "./models"

export const VALID_MODEL_IDS = [
  "gpt-4-turbo-preview",
  "mistral-medium",
  "mistral-large"
] as const

export type LLMID = (typeof VALID_MODEL_IDS)[number]

export interface LLM {
  modelId: LLMID
  modelName: string
  provider: ModelProvider
  imageInput: boolean
  shortModelName?: string
}

export type ModelWithWebSearch = LLMID | `${LLMID}:websearch`
