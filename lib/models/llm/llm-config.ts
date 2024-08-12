import {
  getPentestGPTInfo,
  getPentestGPTSystemPromptEnding,
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
    providerRouting: {
      order: [`${process.env.OPENROUTER_FIRST_PROVIDER}`]
    },
    apiKey: process.env.OPENROUTER_API_KEY
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: process.env.OPENAI_API_KEY
  },
  systemPrompts: {
    // For question generator
    pentestgptCurrentDateOnly: `${initialSystemPrompt}\n${currentDate}`,
    // For transforming user query into tool command
    openaiCurrentDateOnly: `${openaiInitialSystemPrompt}\n${currentDate}`,
    // For Hacker RAG
    RAG: `${initialSystemPrompt} ${process.env.RAG_SYSTEM_PROMPT}\n${currentDate}`,
    // For PGPT-3.5
    pgpt35WithTools: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${getPentestGPTToolsInfo(true)}\n${getPentestGPTSystemPromptEnding}`,
    // For PGPT-4
    pentestGPTChat: `${getPentestGPTInfo(initialSystemPrompt)}\n${getPentestGPTSystemPromptEnding}`,
    // For GPT-4o
    gpt4oWithTools: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${getPentestGPTToolsInfo(true, true)}\n${getPentestGPTSystemPromptEnding}`,
    // For browser tool
    pentestGPTBrowser: `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${getPentestGPTToolsInfo(true)}\n${getPentestGPTSystemPromptEnding}`,
    // For webSearch tool
    pentestGPTWebSearch: `${getPentestGPTInfo(initialSystemPrompt, false, true)}\n${getPentestGPTSystemPromptEnding}`
  },
  models: {
    pentestgpt_default_openrouter:
      process.env.OPENROUTER_PENTESTGPT_DEFUALT_MODEL,
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
