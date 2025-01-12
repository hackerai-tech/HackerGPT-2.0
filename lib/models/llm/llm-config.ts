import { getTerminalResultInstructions } from "@/lib/tools/tool-store/prompts/system-prompt"
import {
  getPentestGPTInfo,
  systemPromptEnding,
  getPentestGPTToolsInfo
} from "./llm-prompting"

const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric"
}
const currentDate = `Current date: ${new Date().toLocaleDateString("en-US", options)}`

const initialSystemPrompt = `${process.env.SECRET_PENTESTGPT_SYSTEM_PROMPT}`
const openaiInitialSystemPrompt = `${process.env.SECRET_OPENAI_SYSTEM_PROMPT}`

const llmConfig = {
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    url: `https://openrouter.ai/api/v1/chat/completions`,
    apiKey: process.env.OPENROUTER_API_KEY
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY
  },
  systemPrompts: {
    // For question generator
    pentestgptCurrentDateOnly: `${initialSystemPrompt}\n${currentDate}`,
    // For transforming user query into tool command
    openaiCurrentDateOnly: `${openaiInitialSystemPrompt}\n${currentDate}`,
    // For Hacker RAG
    RAG: `${initialSystemPrompt} ${process.env.RAG_SYSTEM_PROMPT}\n${currentDate}`,
    // For PGPT
    pentestGPTChat: `${getPentestGPTInfo(initialSystemPrompt)}\n${systemPromptEnding}`,
    // For PGPT-Small
    pgptSmall: `${getPentestGPTInfo(initialSystemPrompt, true, false, "PGPT-Small")}\n${systemPromptEnding}`,
    // For PGPT-Large
    pgptLarge: `${getPentestGPTInfo(initialSystemPrompt, true, true, "PGPT-Large")}\n${getPentestGPTToolsInfo(true, true)}\n${systemPromptEnding}`,
    // For GPT-4o
    gpt4o: `${getPentestGPTInfo(initialSystemPrompt, true, true, "GPT-4o")}\n${getPentestGPTToolsInfo(true, true, true, false, "GPT-4o")}\n${systemPromptEnding}`,
    // For browser tool
    pentestGPTBrowser: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${systemPromptEnding}`,
    // For webSearch tool
    pentestGPTWebSearch: `${getPentestGPTInfo(initialSystemPrompt, false, true)}\n${systemPromptEnding}`,
    // For terminal tool
    pentestGPTTerminal: `${getPentestGPTInfo(initialSystemPrompt, true, false, "GPT-4o")}\n\n${getPentestGPTToolsInfo(false, false, true)}\n${getTerminalResultInstructions()}\n${systemPromptEnding}`,
    // For fragment tool
    pentestGPTFragment: `${getPentestGPTInfo(initialSystemPrompt, true, false, "GPT-4o")}}`
  },
  models: {
    // OpenRouter
    pentestgpt_default_openrouter:
      process.env.OPENROUTER_PENTESTGPT_DEFAULT_MODEL,
    pentestgpt_standalone_question_openrouter:
      process.env.OPENROUTER_STANDALONE_QUESTION_MODEL,
    pentestgpt_pro_openrouter: process.env.OPENROUTER_PENTESTGPT_PRO_MODEL
  },
  hackerRAG: {
    enabled:
      (process.env.HACKER_RAG_ENABLED?.toLowerCase() || "false") === "true",
    endpoint: process.env.HACKER_RAG_ENDPOINT,
    getDataEndpoint: process.env.HACKER_RAG_GET_DATA_ENDPOINT,
    apiKey: process.env.HACKER_RAG_API_KEY,
    messageLength: {
      min: parseInt(process.env.MIN_LAST_MESSAGE_LENGTH || "25", 10),
      max: parseInt(process.env.MAX_LAST_MESSAGE_LENGTH || "1000", 10)
    }
  }
}

export default llmConfig
