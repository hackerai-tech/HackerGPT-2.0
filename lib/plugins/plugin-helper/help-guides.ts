import {
  SQLI_ALLOWED_TAMPERS,
  SQLI_ALLOWED_TECHNIQUES
} from "@/lib/tools/tool-helper/tools-flags"
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

export const displayHelpGuideForKatana = () => {
  return endent`
    [Katana](${pluginUrls.KATANA}) is a fast crawler focused on execution in automation pipelines offering both headless and non-headless crawling.
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Interact with Katana conversationally by simply describing your web crawling needs in plain language. The AI will understand your requirements and automatically configure and execute the appropriate Katana command, facilitating an intuitive user experience.
      
    **Direct Commands:**
    Use direct commands to specifically control the crawling process. Begin your command with the program name followed by relevant flags to precisely define the crawling scope and parameters.

    \`\`\`
      Usage:
         /katana [flags]
    
      Flags:
      INPUT:
         -u, -list string[]  target url / list to crawl
  
      CONFIGURATION:
         -d, -depth int               maximum depth to crawl (default 3)
         -jc, -js-crawl               enable endpoint parsing / crawling in javascript file
         -timeout int                 time to wait for request in seconds (default 15)
         -iqp, -ignore-query-params   Ignore crawling same path with different query-param values
  
      HEADLESS:
         -xhr, -xhr-extraction   extract xhr request url,method in jsonl output
      
      PASSIVE:
         -ps, -passive                   enable passive sources to discover target endpoints
         -pss, -passive-source string[]  passive source to use for url discovery (waybackarchive,commoncrawl,alienvault)

      SCOPE:
         -cs, -crawl-scope string[]        in scope url regex to be followed by crawler
         -cos, -crawl-out-scope string[]   out of scope url regex to be excluded by crawler
         -do, -display-out-scope           display external endpoint from scoped crawling
  
      FILTER:
         -mr, -match-regex string[]        regex or list of regex to match on output url (cli, file)
         -fr, -filter-regex string[]       regex or list of regex to filter on output url (cli, file)
         -em, -extension-match string[]    match output for given extension (eg, -em php,html,js)
         -ef, -extension-filter string[]   filter output for given extension (eg, -ef png,css)
         -mdc, -match-condition string     match response with dsl based condition
         -fdc, -filter-condition string    filter response with dsl based condition
      
      OUTPUT:
         -output string  write output to a file
    \`\`\``
}

export const displayHelpGuideForLinkFinder = () => {
  return endent`
    [Link Finder](${pluginUrls.LINKFINDER}) is a minimalistic JavaScript endpoint extractor that efficiently pulls endpoints from HTML and embedded JavaScript files. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Interact with LinkFinder using plain language to describe your endpoint extraction needs. The AI will understand your input and automatically execute the corresponding command with LinkFinder, simplifying the process for intuitive use.
    
    **Direct Commands:**
    For precise and specific tasks, use direct commands. Begin your command with "/" and include necessary flags to control the extraction process effectively.
    
    \`\`\`
      Usage:
         /linkfinder --domain [domain]
  
      Flags:
      CONFIGURATION:
         -d --domain string   Input a URL.

      OUTPUT:  
         --output string  write output to a file
    \`\`\``
}

// TOOLS
export const displayHelpGuideForPortScanner = () => {
  return endent`
     [Port Scanner](${pluginUrls.PORTSCANNER}) is a fast and efficient tool for scanning ports on specified hosts.
 
     ## Interaction Methods
 
     **Conversational AI Requests:**
     Engage with Port Scanner by describing your port scanning needs in plain language. The AI will interpret your request and automatically execute the relevant command, offering a user-friendly interface for those who prefer intuitive interactions.
 
     **Direct Commands:**
     Utilize direct commands for granular control over port scanning. Start your command with "/" followed by the necessary flags to specify detailed parameters for the scan.
     
     \`\`\`
     Usage:
        /portscanner [flags]
      
     Flags:
     INPUT:
        -host string[]          hosts to scan ports for (comma-separated)
        -scan-type, -st string  type of scan to perform: "light", "deep", or "custom"
        -port, -p               specific ports to scan [80,443, 100-200] (for custom scan type) 
        -top-ports, -tp string  number of top ports to scan [full,100,1000] (for custom scan type)
        -no-svc                 disable service detection
 
     Scan Types:
        light:   scans the top 100 most common ports
        deep:    scans the top 1000 most common ports
        custom:  allows you to specify ports or top ports to scan
 
     Examples:
        /portscanner -host example.com -scan-type light
        /portscanner -host 104.18.36.214,23.227.38.33 -scan-type deep
        /portscanner -host example.com -scan-type custom -port 80,443,8080
        /portscanner -host example.com -scan-type custom -top-ports 500
      \`\`\``
}

export const displayHelpGuideForSubdomainFinder = () => {
  return endent`
    [Subdomain Finder](${pluginUrls.SUBFINDER}) is a powerful subdomain discovery tool designed to enumerate and uncover valid subdomains of websites efficiently through passive online sources. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage with Subfinder by describing your subdomain discovery needs in plain language. The AI will interpret your request and automatically execute the relevant command with Subfinder, offering a user-friendly interface for those who prefer intuitive interactions.
    
    **Direct Commands:**
    Utilize direct commands for granular control over subdomain discovery. Start your command with "/" followed by the necessary flags to specify detailed parameters for the scan.
    
    \`\`\`
    Usage:
    /subfinder [flags]
 
   Flags:
   INPUT:
      -d, -domain string[]   domains to find subdomains for (comma-separated)

   CONFIGURATION:
      -nW, -active           display active subdomains only

   OUTPUT:
      -oJ, -json             write output in JSONL(ines) format
      -output string         write output to a file
      -oI, -ip               include host IP in output (-active only)
   
   Examples:
      /subfinder -d example.com
      /subfinder -d example.com -output subdomains.txt
      /subfinder -d example.com,example.org -active
      /subfinder -d example.com -json -active -ip
    \`\`\``
}

export const displayHelpGuideForSSLScanner = () => {
  return endent`
      [SSL/TLS Scanner](${pluginUrls.SSLSCANNER}) is a specialized tool for analyzing SSL/TLS configurations and vulnerabilities on specified hosts.
  
      ## Interaction Methods
  
      **Conversational AI Requests:**
      Engage with SSL Scanner by describing your SSL/TLS scanning needs in plain language. The AI will interpret your request and automatically execute the relevant command, offering a user-friendly interface for those who prefer intuitive interactions.
  
      **Direct Commands:**
      Utilize direct commands for granular control over SSL/TLS scanning. Start your command with "/" followed by the necessary flags to specify detailed parameters for the scan.
      
      \`\`\`
      Usage:
         /sslscanner [flags]
       
      Flags:
      INPUT:
         -host string            single host to scan (domain or IP address)
         -scan-type, -st string  type of scan to perform: "light", "deep", or "custom"
         -port, -p string        specific ports to scan [443,8443] (for custom scan type) 
         -top-ports, -tp string  number of top SSL/TLS ports to scan [full,100,1000] (for custom scan type)
         -no-vuln-check          disable vulnerability checks
  
      Scan Types:
         light:   scans only port 443 of the provided domain or IP (default)
         deep:    performs a thorough scan of SSL/TLS configurations and vulnerabilities on the top 1000 ports
         custom:  allows you to specify ports or top ports to scan
  
      IMPORTANT:
         - Only one target (domain or IP) can be scanned at a time.
         - Light scan (default) only checks port 443.
         - Deep scan checks the top 1000 ports.
  
      Examples:
         /sslscanner -host example.com
         /sslscanner -host 104.18.36.214 -scan-type deep
         /sslscanner -host example.com -scan-type custom -port 443,8443
         /sslscanner -host example.com -scan-type deep -no-vuln-check
       \`\`\``
}

export const displayHelpGuideForSQLIExploiter = () => {
  return endent`
   [SQLi Exploiter](${pluginUrls.SQLIEXPLOITER}) is a powerful tool for detecting and exploiting SQL injection vulnerabilities in web applications.
 
   ## Interaction Methods
 
   **Conversational AI Requests:**
   
   Engage with SQLi Exploiter by describing your SQL injection testing needs in plain language. The AI will interpret your request and automatically execute the relevant command, offering a user-friendly interface for those who prefer intuitive interactions.
 
   **Direct Commands:**

   Utilize direct commands for granular control over SQL injection testing. Start your command with "/" followed by the necessary flags to specify detailed parameters for the scan.
 
   \`\`\`
   Usage:
      /sqliexploiter [flags]
 
   Flags:
   INPUT:
      -u string             Target URL to scan (must start with http:// or https://)
      -method string        HTTP method to use: GET or POST (default: GET)
      -data string          POST data to include in the payload (e.g., "id=1")
      -enum string          Data to extract: current-user, current-db, hostname (comma-separated)
      -crawl                Enable light crawling of the target
      -cookie string        HTTP Cookie header to include in each request
      -p string             Comma-separated list of parameters to test
      -dbms string          Force specific database type for payloads
      -prefix string        String to prepend to each payload
      -suffix string        String to append to each payload
      -tamper string        Script to modify payloads (${SQLI_ALLOWED_TAMPERS.join(", ")})
      -level int            Level of tests to perform (1-5, default: 1)
      -risk int             Risk of tests to perform (1-3, default: 1)
      -code int             HTTP code to match when a query is evaluated to True
      -technique string     SQLi techniques to use (${SQLI_ALLOWED_TECHNIQUES.join("")})
      \`\`\`

   **IMPORTANT:**
      - All URLs must start with http:// or https://
      - Higher levels and risks increase scan time and potential impact on the target
      - Use advanced options carefully, especially on production systems
 
   **Examples:**
      \`\`\`
      /sqliexploiter -u http://example.com/page.php?id=1
      /sqliexploiter -u http://example.com/login.php -method POST -data "username=admin&password=test"
      /sqliexploiter -u http://example.com/search.php?q=test -enum current-user,current-db -level 3 -risk 2
      /sqliexploiter -u http://example.com/page.php?id=1 -crawl -tamper space2comment -technique BEUSTQ
      \`\`\`

   **Additional Information:**
      - Level: Higher levels test more entry points (e.g., cookies, headers) but take longer.
      - Risk: Higher risks include more aggressive tests that might impact database performance.
      - Techniques: B (Boolean), E (Error), U (UNION), S (Stacked queries), T (Time-based), Q (Inline queries)
      `
}

export const displayHelpGuideForWhoisLookup = () => {
  return endent`
     [Whois Lookup](${pluginUrls.WHOIS}) is a tool for querying domain name and IP address ownership information.
 
     ## Interaction Methods
 
     **Conversational AI Requests:**
     
     Engage with Whois Lookup by describing your domain or IP lookup needs in plain language. The AI will interpret your request and automatically execute the relevant command, offering a user-friendly interface for those who prefer intuitive interactions.
 
     **Direct Commands:**
 
     Utilize direct commands for precise Whois lookups. Start your command with "/" followed by the necessary flags to specify the target and options.
 
     \`\`\`
     Usage:
        /whois [flags]
 
     Flags:
     INPUT:
        -t, -target string   Target domain or IP address to lookup
     \`\`\`
 
     **IMPORTANT:**
        - The target can be either a domain name or an IP address
        - Some Whois servers may have rate limits, so use responsibly
 
     **Examples:**
        \`\`\`
        /whois -t example.com
        /whois -t 8.8.8.8
        \`\`\`
 
     **Additional Information:**
        - Whois provides information such as:
          * Domain registrar and registration dates
          * Name servers
          * Registrant contact information (if available)
          * IP address range and associated organization
        - Some information may be redacted for privacy reasons
        - The raw output option can provide more detailed information, but may be harder to read
     `
}
