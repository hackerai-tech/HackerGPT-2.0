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
