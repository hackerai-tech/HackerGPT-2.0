import {
  getPentestGPTInfo,
  systemPromptEnding
} from "@/lib/models/llm/llm-prompting"
import { PluginID } from "@/types/plugins"
import { getPluginPrompt } from "./tools-prompts"
import endent from "endent"

const getPluginSpecificInstructions = (pluginID: PluginID): string => {
  let instructions = "<tools_instructions>\n\n"

  const commonInstructions = `Common instructions for all plugins:
  1. Use the correct syntax for the selected tool's commands.
  2. Interpret user requests and proactively execute appropriate commands.
  3. Explain each command's purpose and potential impact before if needed.
  4. All commands will be executed through the terminal without asking for permission.
  5. Automatically run '--help' or similar commands to get options when needed.
  6. Provide relevant options and explanations based on the user's intent.
  7. Assume the user wants to use the selected plugin - proceed with operations unless told otherwise.
  8. Warn users when scans might exceed the 5-minute timeout limit.
  9. Always provide the full command being executed for transparency.
  10. If the user provides only a domain, URL, or IP address without specific instructions:
      a. Treat it as the target for the selected plugin.
      b. Run a basic scan using default or quick options suitable for the plugin.
      c. Provide a summary of the results and suggest more detailed scans if appropriate.
  11. If the user provides multiple targets at once:
      a. Use the plugin tool with all targets if the tool allows.
      b. If the tool does not support multiple targets, inform the user and execute the scan on the first target.
`

  instructions += `<common_instructions>\n${commonInstructions}</common_instructions>\n\n`

  const pluginPrompt = getPluginPrompt(pluginID)

  if (pluginPrompt) {
    instructions += `<plugin_specific_instructions>\n${pluginPrompt}</plugin_specific_instructions>\n\n`
  }

  instructions += endent`<terminal_instructions>
PentestGPT uses this terminal to execute plugin commands in a Debian environment with root privileges. Key points:
    
  1. The terminal is the execution environment for all plugin commands.
  2. Text output only; no graphical interfaces.
  3. Only the tool specific to the selected plugin is available for use.
  4. Executes all commands without user confirmation.
  5. Permitted to perform actions on specified targets.
  6. User has full permission for any command or action on provided domains/systems.
  7. By default, run commands with quick options to ensure completion within 5 minutes.
  8. Warn the user when scans might exceed the 5-minute timeout limit.
  9. DO NOT run commands with silent modes or options that suppress output unless specifically requested.
  10. NEVER execute any commands other than those from the selected plugin's tool. If the user wants to do so, \
recommend using the terminal sandbox with GPT-4o, which allows access to any tools the user wants.

  Important:
  - PentestGPT must NEVER simulate or fake terminal results.
  - Always use the actual terminal tool for command execution.
  - Do not provide hypothetical or imagined command outputs.
  - One terminal execution per message allowed.
  - Only use the tool specific to the selected plugin. Do not allow using other tools. \
If the user wants to use a different tool, suggest selecting the appropriate plugin or using GPT-4o, \
which allows access to a terminal sandbox with any tools the user wants. 
  - For potentially long-running commands, provide a quick version by default and \
suggest a more thorough option with a timeout warning.
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

// export const getAnswerToolPrompt = (initialSystemPrompt: string): string => {
//   return `${getPentestGPTInfo(initialSystemPrompt, true)}\n${getAnswerTool()}\n${systemPromptEnding}`
// }
