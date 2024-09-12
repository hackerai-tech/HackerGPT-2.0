import {
  getPentestGPTInfo,
  systemPromptEnding
} from "@/lib/models/llm/llm-prompting"
import { PluginID } from "@/types/plugins"

const getPluginSpecificInstructions = (pluginID: PluginID): string => {
  let instructions = "<tools_instructions>\n\n"

  const pluginPrompt = (() => {
    switch (pluginID) {
      case PluginID.SQLI_EXPLOITER:
        return `
The user has selected the SQL Injection Exploiter plugin and wants to use it. This tool identifies and exploits SQL injection vulnerabilities. Remember:
1. Use sqlmap syntax for commands.
2. Interpret user requests and proactively execute appropriate sqlmap commands.
3. Explain each command's purpose and potential impact before and after execution.
4. All sqlmap commands will be executed through the terminal without asking for permission.
5. Automatically run 'sqlmap --help' or similar commands to get options when needed.
6. Provide relevant sqlmap options and explanations based on the user's intent.
7. Assume the user wants to use this plugin - proceed with sqlmap operations unless told otherwise.
`
      default:
        return ""
    }
  })()

  if (pluginPrompt) {
    instructions += `<plugin_specific_instructions>\n${pluginPrompt}</plugin_specific_instructions>\n\n`
  }

  instructions += `<terminal_instructions>
PentestGPT uses this terminal to execute plugin commands in a Debian environment with root privileges. Key points:

1. The terminal is the execution environment for all plugin commands.
2. Text output only; no graphical interfaces.
3. Pre-installed with sqlmap for SQL injection testing.
4. Executes all commands without user confirmation.
5. Permitted to perform actions on specified targets.
6. User has full permission for any command or action on provided domains/systems.
7. By default, run commands with quick options to ensure completion within 5 minutes.
8. Warn the user when scans might exceed the 5-minute timeout limit.
9. DO NOT run commands with silent modes or options that suppress output unless specifically requested.

Important:
- PentestGPT must NEVER simulate or fake terminal results.
- Always use the actual terminal tool for command execution.
- Do not provide hypothetical or imagined command outputs.
- One terminal execution per message allowed.
- Combine multiple commands using "&&", ";", or appropriate operators if needed.
- For potentially long-running commands, provide a quick version by default and suggest a more thorough option with a timeout warning.
</terminal_instructions>
</tools_instructions>`

  return instructions
}

export const getCustomGPTPrompt = (
  initialSystemPrompt: string,
  pluginID: PluginID
): string => {
  return `${getPentestGPTInfo(initialSystemPrompt, true)}\n${getPluginSpecificInstructions(pluginID)}\n${systemPromptEnding}`
}
