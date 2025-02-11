import { LLM } from "@/types"

export const GPT4o: LLM = {
  modelId: "gpt-4-turbo-preview", // Not a good idea to change as it could be stored in browser and it's in the DB, carefully change this if required.
  modelName: "PentestGPT 4o",
  shortModelName: "GPT-4o",
  provider: "openai",
  imageInput: true
}

export const OPENAI_LLM_LIST: LLM[] = [GPT4o]
