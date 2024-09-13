import { Message } from "@/types/chat"
import endent from "endent"

export const transformUserQueryToDNSScannerCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"

    Based on this query, generate a command for the 'dnsscanner' tool, which is designed to perform DNS reconnaissance and gather information about domain name systems. The command should follow this structured format:

    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "dnsscanner [flags]" }
    \`\`\`
    Replace '[flags]' with the appropriate flags and values based on the user's query. Ensure the command is properly escaped to be valid JSON.

    After the command, provide a very brief explanation ONLY if it adds value to the user's understanding. This explanation should be concise, clear, and enhance the user's comprehension of why certain flags were used or what the command does. Omit the explanation for simple or self-explanatory commands.

    Command Construction Guidelines:
    1. **Target Specification** (Required):
      - -target, -t string: Specifies the target domain for the DNS scan.
    2. **Zone Transfer** (Optional):
      - -zone-transfer, -z: Test all NS servers for a zone transfer.

    IMPORTANT:
    - Generate only one command at a time.
    - Only one target domain can be scanned at a time.
    - Use -help flag when the user asks for help or information about the tool.
    - Provide explanations only when they add value to the user's understanding.

    Example Commands:
    For a basic scan with domain:
    \`\`\`json
    { "command": "dnsscanner -target example.com" }
    \`\`\`

    For a request for help:
    \`\`\`json
    { "command": "dnsscanner -help" }
    \`\`\`

    Response:`

  return answerMessage
}
