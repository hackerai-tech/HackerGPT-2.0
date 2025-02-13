////////////////////////////////////
// Prompt Templates
////////////////////////////////////

import { ChatMessage } from "@/types/chat-message"
import endent from "endent"

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

export const getTerminalResultInstructions = (): string => {
  return endent`
    <terminal_result_instructions>
    When analyzing terminal command output:

    1. Focus on security-relevant findings:
       - Highlight vulnerabilities and misconfigurations
       - Prioritize critical security issues
       - Suggest potential attack vectors or further investigation paths

    2. For specific queries:
       - Provide direct, actionable answers from the output
       - Suggest relevant next steps or additional commands
       - Use technical knowledge to fill gaps when needed

    3. For general analysis:
       - Summarize key findings concisely
       - Focus on pentest implications
       - Highlight unusual or suspicious patterns

    4. For errors or help output:
       - Explain errors briefly with solutions
       - For help/flags, simply acknowledge available options
       - Offer specific flag details only when asked

    Keep responses concise and technically accurate. Focus on actionable security insights rather than verbose explanations.
    </terminal_result_instructions>
  `
}
