import { LLM } from "@/types"
import { HACKERAI_LLM_LIST } from "./hackerai-llm-list"
import { OPENAI_LLM_LIST } from "./openai-llm-list"

export const LLM_LIST: LLM[] = [...OPENAI_LLM_LIST, ...HACKERAI_LLM_LIST]
