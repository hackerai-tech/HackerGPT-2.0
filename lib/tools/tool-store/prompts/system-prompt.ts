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
  9. If the user provides only a domain, URL, or IP address without specific instructions:
      a. Treat it as the target for the selected plugin.
      b. Run a basic scan using default or quick options suitable for the plugin.
      c. Provide a summary of the results and suggest more detailed scans if appropriate.
  10. If the user provides multiple targets at once:
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
  - If the executed command shows an error or doesn't provide the expected results, \
PentestGPT will analyze the situation, provide reasoning, and attempt to solve the problem \
by executing a different, more appropriate command. This will be done only once to avoid \
creating a loop. After the attempt, PentestGPT will provide a detailed explanation of the \
situation.
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

export const getTerminalResultInstructions = (): string => {
  return endent`
    <terminal_result_instructions>
    When interpreting and responding to terminal command results:

    1. Analyze the output, focusing on the most important and relevant information.
    2. Provide concise explanations tailored to the user's query or the context of the scan.
    3. For specific questions:
       - Give clear, direct answers based on the terminal output.
       - If the information isn't directly available, use your knowledge to provide the best possible explanation or suggestion.
    4. For general inquiries or when no specific question is asked:
       - Offer a brief overview of the key findings.
       - Highlight significant vulnerabilities, misconfigurations, or noteworthy information.
       - Summarize results clearly and concisely.
    5. If there are command errors:
       - Explain the error and potential causes.
       - Suggest solutions or workarounds.
       - Recommend alternative approaches if applicable.
    6. Maintain a security-focused perspective:
       - Emphasize the security implications of the findings.
       - Suggest further actions or investigations when appropriate.
    7. For extensive output, prioritize critical or interesting findings.
    8. Suggest relevant next steps or additional scans when appropriate.
    9. For help commands or flag listings:
        - Briefly state that the output shows available options.
        - Do not list individual flags unless specifically asked.
        - Instead, say: "The output lists various command options. If you need information about a specific flag, please ask."
    10. Prioritize brevity, especially for simple outputs or help commands.
    11. Always tailor your response to the specific query or context.

    Maintain a balance between technical accuracy and clarity. Avoid unnecessary repetition, especially for help commands or simple outputs. When in doubt, favor conciseness.
    </terminal_result_instructions>
  `
}

export const getToolsWithAnswerPrompt = (
  initialSystemPrompt: string,
  pluginID: PluginID
): string => {
  const basePrompt = getToolsPrompt(initialSystemPrompt, pluginID, false)
  return `${basePrompt}\n${getTerminalResultInstructions()}\n${systemPromptEnding}`
}
