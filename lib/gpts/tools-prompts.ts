import {
  getPentestGPTInfo,
  systemPromptEnding
} from "@/lib/models/llm/llm-prompting"
import { PluginID } from "@/types/plugins"

const getPluginSpecificInstructions = (pluginID: PluginID): string => {
  let instructions = "<tools_instructions>\n\n"

  const commonInstructions = `
Common instructions for all plugins:
1. Use the correct syntax for the selected tool's commands.
2. Interpret user requests and proactively execute appropriate commands.
3. Explain each command's purpose and potential impact before and after execution.
4. All commands will be executed through the terminal without asking for permission.
5. Automatically run '--help' or similar commands to get options when needed.
6. Provide relevant options and explanations based on the user's intent.
7. Assume the user wants to use the selected plugin - proceed with operations unless told otherwise.
8. Warn users when scans might exceed the 5-minute timeout limit.
9. Always provide the full command being executed for transparency.
`

  instructions += `<common_instructions>\n${commonInstructions}</common_instructions>\n\n`

  const pluginPrompt = (() => {
    switch (pluginID) {
      case PluginID.SQLI_EXPLOITER:
        return `
The user has selected the SQL Injection Exploiter plugin using sqlmap. This tool identifies and exploits SQL injection vulnerabilities. Remember:
1. Focus on SQL injection vulnerabilities and exploitation techniques.
2. Provide sqlmap-specific options and explanations.
`
      case PluginID.SSL_SCANNER:
        return `
The user has selected the SSL Scanner plugin using testssl.sh to find SSL/TLS issues like POODLE, Heartbleed, DROWN, ROBOT, etc. Remember:
1. Focus on SSL/TLS vulnerabilities and scanning techniques.
2. Pay special attention to well-known vulnerabilities like POODLE, Heartbleed, DROWN, and ROBOT.
3. Provide clear explanations of any SSL/TLS issues discovered during the scan.
4. For deep scans, use a combination of options to provide comprehensive results, such as:
   - '--full' for including tests for implementation bugs and cipher per protocol
   - '-U' or '--vulnerable' to test for all applicable vulnerabilities
   - '-p' or '--protocols' to check TLS/SSL protocols
   - '-S' or '--server-defaults' to display the server's default picks and certificate info
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
