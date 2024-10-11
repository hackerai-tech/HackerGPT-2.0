import { LLM } from "@/types"

export const PGPT3_5: LLM = {
  modelId: "mistral-medium",
  modelName: "PentestGPT Small",
  shortModelName: "PGPT-Small",
  provider: "mistral",
  hostedId: "mistral-medium",
  imageInput: true
}

export const PGPT4: LLM = {
  modelId: "mistral-large",
  modelName: "PentestGPT Large",
  shortModelName: "PGPT-Large",
  provider: "mistral",
  hostedId: "mistral-large",
  imageInput: true
}

export const HACKERAI_LLM_LIST: LLM[] = [PGPT3_5, PGPT4]
