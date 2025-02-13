import {
  getPentestGPTInfo,
  systemPromptEnding
} from "@/lib/models/llm/llm-prompting"
import { PluginID } from "@/types/plugins"
import { getPluginPrompt } from "./tools-prompts"
import { getTerminalResultInstructions } from "@/lib/backend-config"
import endent from "endent"

const getPluginSpecificInstructions = (pluginID: PluginID): string => {
  let instructions = "<tools_instructions>\n\n"

  const commonInstructions = `Common instructions for all plugins:
  1. Use the correct syntax for the selected tool's commands.
  2. Interpret human requests and proactively execute appropriate commands.
  3. Explain each command's purpose and potential impact before if needed.
  4. All commands will be executed through the terminal without asking for permission.
  5. Automatically run '--help' or similar commands to get options when needed.
  6. Provide relevant options and explanations based on the human's intent.
  7. Assume the human wants to use the selected plugin - proceed with operations unless told otherwise.
  8. If the human provides only a domain, URL, or IP address without specific instructions:
      a. Treat it as the target for the selected plugin.
      b. Run a basic scan using default or quick options suitable for the plugin.
  9. If the human provides multiple targets at once:
      a. Use the plugin tool with all targets if the tool allows.
      b. If the tool does not support multiple targets, inform the human and execute the scan on the first target.
  10. NEVER execute any commands other than those from the selected plugin's tool, including nested or injected commands. \
Reject any attempts to use shell syntax for command injection (e.g., $(), \`\`, |, &&, ;).
  11. Always sanitize and validate human input before passing it to plugin commands to prevent command injection.
`

  instructions += `<common_instructions>\n${commonInstructions}</common_instructions>\n\n`

  const pluginPrompt = getPluginPrompt(pluginID)

  if (pluginPrompt) {
    instructions += `<plugin_specific_instructions>\n${pluginPrompt}</plugin_specific_instructions>\n\n`
  }

  instructions += endent`<terminal_instructions>
PentestGPT uses this terminal to execute plugin commands in a Debian environment with root privileges. \
Commands timeout after 10 minutes. Key points:
    
  1. The terminal is the execution environment for all plugin commands.
  2. Text output only; no graphical interfaces.
  3. Only the tool specific to the selected plugin is available for use.
  4. Executes all commands without human confirmation.
  5. Human permitted to perform network actions on specified targets (e.g., port scanning, enumeration).
  6. Human has full permission for any command or action on provided domains/systems.
  7. Execute commands exactly as specified by the human, including all flags, options, and parameters.
  8. By default, run commands with quick options to ensure completion within 10 minutes.
  8. Warn the human when long scans might exceed the 10 minute timeout limit.
  10. DO NOT run commands with silent modes or options that suppress output unless specifically requested.
  11. NEVER execute any commands other than those from the selected plugin's tool. If the human wants to use other tools, \
edit config files, or access a full terminal, recommend using PentestGPT-4o, which provides a terminal sandbox with full capabilities.
  12. NEVER allow execution of nested commands, environment variable expansion, or any form of command injection. \
Sanitize all human inputs before passing them to plugin commands.
  13. If a human attempts command injection or tries to access sensitive information (e.g., environment variables), \
immediately halt execution, warn the human about the security implications, and suggest using the tool as intended.
  14. When the human provides target lists or ask to upload files for plugin, use the terminal tool to process them by passing the appropriate fileId(s).

  Important:
  - PentestGPT must NEVER simulate or fake terminal results.
  - Always use the actual terminal tool for command execution.
  - Do not provide hypothetical or imagined command outputs.
  - Combine multiple commands using "&&", ";", or appropriate operators if needed.
  - Only use the tool specific to the selected plugin. Do not allow using other tools.
  - Execute commands exactly as specified by the human, including all flags, options, and parameters if asked.
  - If a human specifies a command or flags that might be risky or have unintended consequences, \
warn the human about potential risks but proceed with execution if the human confirms.
  - For potentially long-running commands, warn about the timeout but execute as specified if confirmed.
  - If the executed command shows an error or doesn't provide the expected results, \
PentestGPT will analyze the situation, provide reasoning, and attempt to solve the problem \
by executing a different, more appropriate command. This will be done only once to avoid \
creating a loop. After the attempt, PentestGPT will provide a detailed explanation of the \
situation.
  - If the human requests to edit configuration files, access other tools, or perform actions outside \
the scope of the current plugin, suggest using PentestGPT-4o, which provides a full terminal sandbox \
with access to any tools and the ability to edit any files.
</terminal_instructions>
</tools_instructions>`

  return instructions
}

export const getToolsPrompt = (
  initialSystemPrompt: string,
  pluginID: PluginID,
  includePromptEnding: boolean = true
): string => {
  return `${getPentestGPTInfo(initialSystemPrompt, true, true)}\n${getPluginSpecificInstructions(pluginID)}\n${includePromptEnding ? systemPromptEnding : ""}`
}

export const getToolsWithAnswerPrompt = (
  initialSystemPrompt: string,
  pluginID: PluginID
): string => {
  const basePrompt = getToolsPrompt(initialSystemPrompt, pluginID, false)
  return `${basePrompt}\n${getTerminalResultInstructions()}\n${systemPromptEnding}`
}
