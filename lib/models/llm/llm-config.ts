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
    baseUrl: "https://openrouter.ai/api/v1",
    url: `https://openrouter.ai/api/v1/chat/completions`,
    apiKey: process.env.OPENROUTER_API_KEY
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY
  },
  fireworks: {
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKey: process.env.FIREWORKS_API_KEY
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
    // For PGPT-3.5
    pgpt35: `${getPentestGPTInfo(initialSystemPrompt, true, true, "PGPT-3.5")}\n${systemPromptEnding}`,
    // For PGPT-4
    pgpt4: `${getPentestGPTInfo(initialSystemPrompt, true, false, "PGPT-4")}\n${systemPromptEnding}`,
    // For GPT-4o
    gpt4o: `${getPentestGPTInfo(initialSystemPrompt, true, true, "GPT-4o")}\n${getPentestGPTToolsInfo(true, true, true, true)}\n${systemPromptEnding}`,
    // For browser tool
    pentestGPTBrowser: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${systemPromptEnding}`,
    // For webSearch tool
    pentestGPTWebSearch: `${getPentestGPTInfo(initialSystemPrompt, false, true)}\n${systemPromptEnding}`
  },
  models: {
    pentestgpt_default_openrouter:
      process.env.OPENROUTER_PENTESTGPT_DEFAULT_MODEL,
    pentestgpt_standalone_question_fireworks:
      process.env.FIREWORKS_STANDALONE_QUESTION_MODEL,
    pentestgpt_pro_fireworks: process.env.OPENROUTER_PENTESTGPT_PRO_MODEL
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
