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

  const pluginPrompt = (() => {
    switch (pluginID) {
      case PluginID.SQLI_EXPLOITER:
        return `
  The user has selected the SQL Injection Exploiter plugin, which uses the sqlmap tool in the terminal. This tool identifies and exploits SQL injection vulnerabilities. Remember:
  1. Focus on SQL injection vulnerabilities and exploitation techniques.
  2. Provide sqlmap-specific options and explanations.
  `
      case PluginID.SSL_SCANNER:
        return `
The user has selected the SSL Scanner plugin, which uses the testssl.sh tool in the terminal to find SSL/TLS issues like POODLE, Heartbleed, DROWN, ROBOT, etc. Remember:
1. Focus on SSL/TLS vulnerabilities and scanning techniques.
2. Pay special attention to well-known vulnerabilities like POODLE, Heartbleed, DROWN, and ROBOT.
3. Provide clear explanations of any SSL/TLS issues discovered during the scan.
4. For deep scans, use a combination of options to provide comprehensive results, such as:
   - '--full' for including tests for implementation bugs and cipher per protocol
   - '-U' or '--vulnerable' to test for all applicable vulnerabilities
   - '-p' or '--protocols' to check TLS/SSL protocols
   - '-S' or '--server-defaults' to display the server's default picks and certificate info
`
      case PluginID.DNS_SCANNER:
        return `
The user has selected the DNS Scanner plugin, which uses the dnsrecon tool in the terminal. This tool performs DNS reconnaissance and discovers misconfigurations in DNS servers. Remember:
1. Focus on DNS enumeration, zone transfers, and identifying potential misconfigurations.
2. Provide dnsrecon-specific options and explanations.
`
      case PluginID.PORT_SCANNER:
        return `
The user has selected the Port Scanner plugin, which uses the naabu tool in the terminal. This tool performs fast port scanning to discover open ports on target systems. Remember:
1. Focus on identifying open ports and potential services running on those ports.
2. Provide naabu-specific options and explanations for efficient scanning.
3. For deep scans, use '1000', and for quick/light scans, use '100'. Never use the '-p-' option; instead, use:
   - '-port' or '-p' for specific ports (e.g., '80,443,100-200')
   - '-top-ports' or '-tp' for top ports (e.g., 'full,100,1000').
4. Naabu can scan multiple hosts at once using the '-host' option (e.g., '-host 192.168.1.1,192.168.1.2').
`
      case PluginID.WAF_DETECTOR:
        return `
The user has selected the WAF Detector plugin, which uses the wafw00f tool in the terminal. This tool fingerprints Web Application Firewalls (WAFs) behind target applications. Remember:
1. Focus on identifying and fingerprinting WAFs protecting the target web application.
2. Provide wafw00f-specific options and explanations for effective WAF detection.
`
      case PluginID.WHOIS_LOOKUP:
        return `
The user has selected the WHOIS Lookup plugin, which uses the whois tool in the terminal. This tool retrieves domain registration information and network details. Remember:
1. Focus on gathering domain ownership, registration dates, name servers, and other relevant information.
2. Provide whois-specific options and explanations for effective domain information retrieval.
`
      case PluginID.SUBDOMAIN_FINDER:
        return `
The user has selected the Subdomain Finder plugin, which uses the subfinder tool in the terminal. This tool discovers subdomains of a given domain. Remember:
1. Focus on efficiently enumerating subdomains of the target domain.
2. Provide subfinder-specific options and explanations for effective subdomain discovery.
`
      case PluginID.CVE_MAP:
        return `
The user has selected the CVEMap plugin, which uses the cvemap tool in the terminal. This tool helps navigate and analyze Common Vulnerabilities and Exposures (CVEs). Remember:
1. Focus on efficiently searching, filtering, and analyzing CVEs.
2. Provide cvemap-specific options and explanations for effective CVE exploration.
3. If the user provides a specific CVE ID, use the '-id' flag:
-id string[]                    List CVE for given ID(s)
4. If the user provides a CWE ID, use the '-cwe' or '-cwe-id' flag:
-cwe, -cwe-id string[]          List CVEs for given CWE ID(s)
5. Do not use the search flag.
6. Always use the '-json' flag by default to provide more detailed information about CVEs:
-json                           Output results in JSON format for more comprehensive details
`

      case PluginID.URL_FUZZER:
        return `
The user has selected the URL Fuzzer plugin, which uses the ffuf tool in the terminal. This tool performs web fuzzing to discover hidden files, directories, and endpoints. Remember:
1. Focus on efficiently fuzzing web applications to uncover hidden or sensitive content.
2. Provide ffuf-specific options and explanations for effective fuzzing.
3. Use wordlists from SecLists located in /opt/SecLists for comprehensive fuzzing. (e.g., -w /opt/SecLists/Discovery/Web-Content/common.txt)
4. For quick scans, use smaller wordlists.
5. Avoid using a very large number of threads or other flags that could generate excessive traffic on the target, potentially resulting in blocks or service disruption.
6. Always use the '-c' flag by default to colorize output, improving user experience. And don't use the threads flag by default.
7. When using the '-e' flag for file extensions, do not include the dot (.) before the extension. For example, use '-e php,bak,db' instead of '-e .php,.bak,.db'.
8. User already has full permission to fuzz target.
`

      case PluginID.WORDPRESS_SCANNER:
        return `
The user has selected the WordPress Scanner plugin, which uses the wpscan tool in the terminal. This tool scans WordPress installations for outdated plugins, core vulnerabilities, user enumeration, and more. Remember:
1. Focus on identifying vulnerabilities in WordPress core, themes, and plugins.
2. Provide wpscan-specific options and explanations for effective WordPress security scanning.
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
