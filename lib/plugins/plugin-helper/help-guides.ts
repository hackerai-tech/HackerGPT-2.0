import { pluginUrls } from "@/types/plugins"
import endent from "endent"

export const displayHelpGuideForCvemap = () => {
  return endent`
     [CVEMap](${pluginUrls.CVEMAP}) is an open-source command-line interface (CLI) tool that allows you to explore Common Vulnerabilities and Exposures (CVEs).
   
     ## Interaction Methods
   
     **Conversational AI Requests:**
     Engage conversationally by describing your CVE search needs in plain language. The AI will interpret your request and seamlessly execute the relevant command using CVEMap, making it user-friendly for those who prefer intuitive interactions.
     
     **Direct Commands:**
     Use direct commands by starting with "/" followed by the command and its specific flags. This method provides exact control, enabling detailed and targeted searches within the CVE database.
     
     \`\`\`
       Usage:
          /cvemap [flags]
     
       Flags:
       OPTIONS:
           -id string[]                    cve to list for given id
           -cwe, -cwe-id string[]          cve to list for given cwe id
           -v, -vendor string[]            cve to list for given vendor
           -p, -product string[]           cve to list for given product
           -s, -severity string[]          cve to list for given severity
           -cs, -cvss-score string[]       cve to list for given cvss score
           -c, -cpe string                 cve to list for given cpe
           -es, -epss-score string         cve to list for given epss score
           -ep, -epss-percentile string[]  cve to list for given epss percentile
           -age string                     cve to list published by given age in days
           -a, -assignee string[]          cve to list for given publisher assignee
           -vs, -vstatus value             cve to list for given vulnerability status in cli output. supported: new, confirmed, unconfirmed, modified, rejected, unknown
   
       OUTPUT:
           -l, -limit int       limit the number of results to display (default 25)
           -output string       write output to a file
     \`\`\`
 
     ## Examples:
 
     1. Search for critical severity CVEs related to Microsoft Windows 10:
     \`\`\`
     /cvemap -v 'microsoft' -p 'windows 10' -s critical -limit 10
     \`\`\`
 
     2. Find recent high-severity CVEs with a CVSS score greater than 8:
     \`\`\`
     /cvemap -s high -cs '> 8' -age '< 30' -limit 15
     \`\`\`
 
     3. Look for confirmed CVEs associated with a specific CWE:
     \`\`\`
     /cvemap -cwe-id 'CWE-79' -vs confirmed -limit 20
     \`\`\`

     These examples demonstrate various ways to use CVEMap for targeted CVE searches. Adjust the flags and values according to your specific needs.
     `
}
