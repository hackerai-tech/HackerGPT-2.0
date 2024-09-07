import { Message } from "@/types/chat"
import endent from "endent"

export const transformUserQueryToCvemapCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'cvemap' tool, focusing on CVE (Common Vulnerabilities and Exposures) discovery. The command should prioritize the most relevant flags for CVE identification and filtering, ensuring the inclusion of flags that specify the criteria such as CVE ID, vendor, or product. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "cvemap [flags]" }
    \`\`\`
    Include any of the additional flags only if they align with the specifics of the request. Ensure the command is properly escaped to be valid JSON.
  
    Command Construction Guidelines:
    1. **Selective Flag Use**: Carefully select flags that are directly pertinent to the task. The available flags are:
      - -id string[]: Specify CVE ID(s) for targeted searching. (e.g., "CVE-2023-0001")
      - -cwe-id string[]: Filter CVEs by CWE ID(s) for category-specific searching. (e.g., ""CWE-79"")
      - -vendor string[]: List CVEs associated with specific vendor(s). (e.g., ""microsoft"")
      - -product string[]: Specify product(s) to filter CVEs accordingly. (e.g., ""windows 10"")
      - -severity string[]: Filter CVEs by given severity level(s). Options: "low", "medium", "high", "critical"
      - -cvss-score string[]: Filter CVEs by given CVSS score range. (e.g., ""> 7"")
      - -cpe string: Specify a CPE URI to filter CVEs related to a particular product and version. (e.g., "cpe:/a:microsoft:windows_10")
      - -epss-score string: Filter CVEs by EPSS score. (e.g., ">=0.01")
      - -epss-percentile string[]: Filter CVEs by given EPSS percentile. (e.g., "">= 90"")
      - -age string: Filter CVEs published within a specified age in days. (e.g., ""> 365"", "360")
      - -assignee string[]: List CVEs for a given publisher assignee. (e.g., "cve@mitre.org")
      - -vstatus value: Filter CVEs by given vulnerability status in CLI output. Supported values: new, confirmed, unconfirmed, modified, rejected, unknown (e.g., "confirmed")
      - -limit int: Limit the number of results to display (default 25, specify a different number as needed).
      - -help: Provide all flags avaiable and information about tool. Use this flag if user asked for help or if user asked for all flags or if user asked about plugin.
      - -output (string): write output to a file. Don't put name of file in quotes. By defualt save into .md file format. (optional)
      Do not include any flags not listed here. Use these flags to align with the request's specific requirements. All flags are optional.
    2. **Quotes around flag content**: If flag content has space between like "windows 10," use "'windows 10'" for any flag. Or another example like "> 15" use "'> 15'" for any flag. Their should always be space between sign like ">", "<", "=", ... and the number. 
    3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient CVEs discovery process.
    4. NOTE: If multiple CVEs or other similar flag values are requested with multiple values, put them all inside of '' and always separate each CVE ID or other flag values with a comma.

    Example Commands:
    For listing recent critical CVEs with publicly available PoCs:
    \`\`\`json
    { "command": "cvemap -severity critical -poc true -limit 10" }
    \`\`\`
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "cvemap -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

// TOOLS
export const transformUserQueryToPortScannerCommand = (
  lastMessage: Message
) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"

    Based on this query, generate a single command for the 'portscanner' tool, focusing on port scanning. The command should use the most relevant flags, with '-host' being essential. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "portscanner -host [host] [scan type and additional flags as needed]" }
    \`\`\`
    Replace '[host]' with the actual hostname or IP address (or comma-separated list for multiple hosts). Ensure the command is properly escaped to be valid JSON.

    After the command, provide a very brief explanation ONLY if it adds value to the user's understanding. This explanation should be concise, clear, and enhance the user's comprehension of why certain flags were used or what the command does. Omit the explanation for simple or self-explanatory commands.

    Command Construction Guidelines:
    1. **Host Specification**:
      - -host string[]: Identifies the target host(s) for network scanning (comma-separated for multiple hosts). (required)
    2. **Scan Type**: Choose the appropriate scan type based on the user's needs:
      - -scan-type light: Scans the top 100 most common ports with service detection. Use when the user wants a quick scan or mentions "common ports".
      - -scan-type deep: Scans the top 1000 most common ports with service detection. Use when the user requests a thorough scan or mentions "all ports".
      - -scan-type custom: IMPORTANT: Always use this when any custom option is specified, even if not explicitly requested by the user.
    3. **Custom Scan Options**: When any of these are used, ALWAYS set -scan-type to custom:
      - -port string: Specific ports to scan (e.g., "80,443,8080", "100-200"). Use when the user lists specific ports.
      - -top-ports string: Number of top ports to scan (full,100,1000). Use when the user specifies a number of top ports to scan.
      - -no-svc: Disable service detection. Use when the user wants to scan ports without detecting services.
    4. **Help Flag**:
      - -help: Display help and all available flags. Use when the user asks for help or information about the tool.

    IMPORTANT: 
    - If any custom option (-port, -top-ports, or -no-svc) is mentioned or implied in the query, ALWAYS use "-scan-type custom" in the command, even if the user didn't explicitly request a custom scan.
    - Provide explanations only when they add value to the user's understanding.

    Example Commands:
    For a quick scan of common ports:
    \`\`\`json
    { "command": "portscanner -host example.com -scan-type light" }
    \`\`\`

    For a scan of specific ports (note the automatic use of custom scan type):
    \`\`\`json
    { "command": "portscanner -host example.com -scan-type custom -port 80,443,8080" }
    \`\`\`
  
    For a request for help:
    \`\`\`json
    { "command": "portscanner -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToSubdomainFinderCommand = (
  lastMessage: Message
) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'subfinder' tool, focusing on subdomain discovery. The command should use only the most relevant flags, with '-domain' being essential. If the request involves discovering subdomains for a specific domain, embed the domain directly in the command rather than referencing an external file. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "subfinder -domain [domain] [additional flags as needed]" }
    \`\`\`
    Replace '[domain]' with the actual domain name and directly include it in the command. Include any of the additional flags only if they align with the specifics of the request. Ensure the command is properly escaped to be valid JSON.

    After the command, provide a very brief explanation ONLY if it adds value to the user's understanding. This explanation should be concise, clear, and enhance the user's comprehension of why certain flags were used or what the command does. Omit the explanation for simple or self-explanatory commands.

    Command Construction Guidelines:
    1. **Direct Domain Inclusion**: When discovering subdomains for a specific domain, directly embed the domain in the command instead of using file references.
      - -domain string[]: Identifies the target domain(s) for subdomain discovery directly in the command. (required)
    2. **Selective Flag Use**: Carefully select flags that are directly pertinent to the task. The available flags are:
      - -active: Display only active subdomains. (optional)
      - -ip: Include host IP in output (always should go with -active flag). (optional)
      - -json: Output in JSON format. (optional)
      - -output (string): write output to a file. Don't put name of file in quotes (optional)
      - -help: Display help and all available flags. (optional)
      Do not include any flags not listed here. Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient subdomain discovery process.

    IMPORTANT:   
    - Provide explanations only when they add value to the user's understanding.

    Example Commands:
    For discovering subdomains for a specific domain directly:
    \`\`\`json
    { "command": "subfinder -domain example.com" }
    \`\`\`
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "subfinder -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToSSLScannerCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"

    Based on this query, generate a single command for the 'sslscanner' tool, focusing on SSL/TLS scanning. The command should use the most relevant flags, with '-host' being essential. By default, use a light scan if no scan type is specified. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "sslscanner -host [host] [scan type and additional flags as needed]" }
    \`\`\`
    Replace '[host]' with a single hostname or IP address. Ensure the command is properly escaped to be valid JSON.

    After the command, provide a very brief explanation ONLY if it adds value to the user's understanding. This explanation should be concise, clear, and enhance the user's comprehension of why certain flags were used or what the command does. Omit the explanation for simple or self-explanatory commands.

    Command Construction Guidelines:
    1. **Host Specification**:
      - -host string: Identifies a single target host (domain or IP address) for SSL/TLS scanning. (required)
    2. **Scan Type**: Choose the appropriate scan type based on the user's needs:
      - -scan-type light: Scans only port 443 of the provided domain or IP. This is the default if no scan type is specified.
      - -scan-type deep: Performs a thorough scan of SSL/TLS configurations and vulnerabilities on the top 1000 ports. Use when the user explicitly requests a comprehensive scan.
      - -scan-type custom: IMPORTANT: Always use this when any custom option is specified, even if not explicitly requested by the user.
    3. **Custom Scan Options**: When any of these are used, ALWAYS set -scan-type to custom:
      - -port string: Specific ports to scan (e.g., "443,8443"). Use when the user lists specific ports.
      - -top-ports string: Number of top SSL/TLS ports to scan (full,100,1000). Use when the user specifies a number of top ports to scan.
    4. **Additional Flags**:
      - -no-vuln-check: Disables vulnerability checks. Use when the user wants to skip vulnerability scanning.
    5. **Help Flag**:
      - -help: Display help and all available flags. Use when the user asks for help or information about the tool.

    IMPORTANT: 
    - Only one target (domain or IP) can be scanned at a time.
    - If no scan type is specified, use "-scan-type light" as the default, which only checks port 443.
    - If any custom option (-port or -top-ports) is mentioned or implied in the query, ALWAYS use "-scan-type custom" in the command, even if the user didn't explicitly request a custom scan.
    - Provide explanations only when they add value to the user's understanding.

    Example Commands:
    For a default light scan (only port 443):
    \`\`\`json
    { "command": "sslscanner -host example.com" }
    \`\`\`

    For a custom scan of specific ports:
    \`\`\`json
    { "command": "sslscanner -host example.com -scan-type custom -port 443,8443" }
    \`\`\`
  
    For a request for help:
    \`\`\`json
    { "command": "sslscanner -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToWhoisLookupCommand = (
  lastMessage: Message
) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"

    Based on this query, generate a command for the 'whoislookup' tool, focusing on domain or IP address information retrieval. By default, use only the '-t' flag for a simple lookup. Include additional flags only if specifically mentioned or clearly implied in the query. The command should follow this structured format:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "whois -t [target] [additional flags if specified]" }
    \`\`\`
    Replace '[target]' with the actual domain name or IP address. Ensure the command is properly escaped to be valid JSON.

    After the command, provide a very brief explanation ONLY if it adds value to the user's understanding. This explanation should be concise, clear, and enhance the user's comprehension of why certain flags were used or what the command does. Omit the explanation for simple or self-explanatory commands.

    Command Construction Guidelines:
    1. **Target Specification** (Required):
      - -t, -target string: Specifies the target domain or IP address for the Whois lookup.

    IMPORTANT: 
    - By default, use only the -t flag for a simple lookup.
    - Include additional flags only when explicitly mentioned or clearly implied in the query.
    - Use -help flag when the user asks for help or information about the tool.
    - Provide explanations only when they add value to the user's understanding.

    Example Commands:
    For a basic lookup:
    \`\`\`json
    { "command": "whois -t example.com" }
    \`\`\`

    For a request for help:
    \`\`\`json
    { "command": "whois -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}
