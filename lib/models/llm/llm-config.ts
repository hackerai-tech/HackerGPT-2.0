import { getTerminalResultInstructions } from "@/lib/backend-config"
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
    apiKey: process.env.OPENAI_API_KEY
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
    url: "https://api.perplexity.ai/chat/completions"
  },
  systemPrompts: {
    // For question generator
    pentestgptCurrentDateOnly: `${initialSystemPrompt}\n${currentDate}`,
    // For transforming user query into tool command
    openaiCurrentDateOnly: `${openaiInitialSystemPrompt}\n${currentDate}`,
    // For Hacker RAG
    RAG: `${initialSystemPrompt} ${process.env.RAG_SYSTEM_PROMPT}\n${currentDate}`,
    // For PGPT
    pentestGPTChat: `${getPentestGPTInfo(initialSystemPrompt, true)}\n${systemPromptEnding}`,
    // For PGPT-Small
    smallModel: `${getPentestGPTInfo(initialSystemPrompt, true, false, "PGPT-Small")}\n${systemPromptEnding}`,
    // For PGPT-Large
    largeModel: `${getPentestGPTInfo(initialSystemPrompt, true, true, "PGPT-Large")}\n${getPentestGPTToolsInfo(false, true)}\n${systemPromptEnding}`,
    // For PentestGPT-4o
    gpt4o: `${getPentestGPTInfo(initialSystemPrompt, true, true, "PentestGPT-4o")}\n${getPentestGPTToolsInfo(true, true, true, true)}\n${systemPromptEnding}`,
    // For browser tool
    pentestGPTBrowser: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${systemPromptEnding}`,
    // For webSearch tool
    pentestGPTWebSearch: `${getPentestGPTInfo(initialSystemPrompt, false, true)}\n${systemPromptEnding}`,
    // For terminal tool
    pentestGPTTerminal: `${getPentestGPTInfo(initialSystemPrompt, true, false, "PentestGPT-4o")}\n\n${getPentestGPTToolsInfo(false, false, true)}\n${getTerminalResultInstructions()}\n${systemPromptEnding}`,
    // For fragment tool
    pentestGPTFragment: `${getPentestGPTInfo(initialSystemPrompt, true, false, "PentestGPT-4o")}}`
  },
  models: {
    pentestgpt_small: process.env.OPENROUTER_PENTESTGPT_DEFAULT_MODEL,
    pentestgpt_standalone_question_openrouter:
      process.env.OPENROUTER_STANDALONE_QUESTION_MODEL,
    pentestgpt_large: process.env.OPENROUTER_PENTESTGPT_PRO_MODEL,
    reasoning: process.env.REASONING_MODEL
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
