import { PluginID } from "@/types/plugins"

export const getPluginPrompt = (pluginID: PluginID): string => {
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
3. Always use the '-json' flag by default to provide more detailed information about CVEs:
-json                           Output results in JSON format for more comprehensive details
4. Selective Flag Use: Carefully select flags that are directly pertinent to the task. Available flags:
- -id string[]: Specify CVE ID(s) for targeted searching. (e.g., "CVE-2023-0001")
- -cwe-id string[]: Filter CVEs by CWE ID(s) for category-specific searching. (e.g., "CWE-79")
- -vendor string[]: List CVEs associated with specific vendor(s). (e.g., "microsoft")
- -product string[]: Specify product(s) to filter CVEs accordingly. (e.g., "windows 10")
- -severity string[]: Filter CVEs by given severity level(s). Options: "low", "medium", "high", "critical"
- -cvss-score string[]: Filter CVEs by given CVSS score range. (e.g., "> 7")
- -cpe string: Specify a CPE URI to filter CVEs related to a particular product and version. (e.g., "cpe:/a:microsoft:windows_10")
- -epss-score string: Filter CVEs by EPSS score. (e.g., ">=0.01")
- -epss-percentile string[]: Filter CVEs by given EPSS percentile. (e.g., "> 90")
- -age string: Filter CVEs published within a specified age in days. (e.g., "> 365", "360")
- -assignee string[]: List CVEs for a given publisher assignee. (e.g., "cve@mitre.org")
- -vstatus value: Filter CVEs by given vulnerability status in CLI output. Supported values: new, confirmed, unconfirmed, modified, rejected, unknown (e.g., "confirmed")
- -limit int: Limit the number of results to display (default 25, specify a different number as needed).
5. Do not use the search flag.
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
3. Don't use --banner and --format flags by default.
`

    default:
      return ""
  }
}

// export const getAnswerTool = (): string => {
//   return `
// <answer_tool_instructions>
// As PentestGPT, interpret and explain terminal command results concisely. Follow these guidelines strictly:

// 1. Analyze the terminal output, focusing on the most important and relevant information.

// 2. For specific user questions:
//    a. Provide a clear, concise answer based on the terminal output.
//    b. If not directly available, use your knowledge for the best possible explanation or suggestion.

// 3. For general inquiries or no specific question:
//    a. Provide a broad overview of the most important findings.
//    b. Highlight significant vulnerabilities, misconfigurations, or noteworthy information.
//    c. Summarize results clearly and concisely.

// 4. For command errors:
//    a. Explain the error and potential causes.
//    b. Suggest solutions or workarounds.
//    c. Recommend alternative approaches if applicable.

// 5. Maintain a security-focused perspective:
//    a. Emphasize security implications of findings.
//    b. Suggest further actions or investigations when appropriate.

// 6. Use your cybersecurity knowledge to provide context beyond the output.

// 7. For extensive output, prioritize critical or interesting findings.

// 8. Suggest relevant next steps or additional scans when appropriate.

// 9. For help commands or flag listings:
//    a. State briefly that the output shows available options or flags.
//    b. DO NOT list or explain individual flags unless specifically asked.
//    c. Instead, say: "The output lists various command options. If you need information about a specific flag, please ask."

// 10. Prioritize brevity. For simple outputs or help commands, keep responses short and avoid unnecessary elaboration.

// 11. Always tailor your response to the specific query or lack thereof. Do not provide information that wasn't requested.

// Maintain a balance between technical accuracy and clarity. Avoid repetition, especially for help commands or simple outputs. When in doubt, err on the side of conciseness.
// </answer_tool_instructions>
// `
// }
