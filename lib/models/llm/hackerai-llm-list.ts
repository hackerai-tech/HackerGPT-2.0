import { LLM } from "@/types"

export const SmallModel: LLM = {
  modelId: "mistral-medium",
  modelName: "PentestGPT Small",
  shortModelName: "PGPT-Small",
  provider: "hackerai",
  imageInput: true
}

export const LargeModel: LLM = {
  modelId: "mistral-large",
  modelName: "PentestGPT Large",
  shortModelName: "PGPT-Large",
  provider: "hackerai",
  imageInput: true
}

export const HACKERAI_LLM_LIST: LLM[] = [SmallModel, LargeModel]
