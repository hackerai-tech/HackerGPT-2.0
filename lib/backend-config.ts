////////////////////////////////////
// Prompt Templates
////////////////////////////////////

import { ChatMessage } from "@/types/chat-message"

export const DEFAULT_TITLE_GENERATION_PROMPT_TEMPLATE = (
  messages: ChatMessage[]
) => `### Task:
You are a helpful assistant that generates concise chat titles. Use the chatName tool to generate a title.

### Instructions:
1. Use the chatName tool to generate a concise title (3-5 words)
2. The title should clearly represent the main theme of the conversation
3. Use the chat's primary language (default to English if multilingual)

### Important:
- You MUST use the chatName tool to generate the title
- Do not generate the title directly in your response
- Do not add any additional text or explanations

### Chat History:
<chat_history>
${messages.map(message => `${message.message.role}: ${message.message.content}`).join("\n")}
</chat_history>`
