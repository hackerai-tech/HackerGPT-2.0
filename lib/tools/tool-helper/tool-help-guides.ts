import { pluginUrls } from "@/types/plugins"
import endent from "endent"

export const displayHelpGuideForDNSScanner = () => {
  return endent`
    [DNS Scanner](${pluginUrls.DNSSCANNER}) is a tool designed to perform DNS reconnaissance and gather information about domain name systems.

    This tool allows you to query DNS servers for various types of records and perform zone transfer attempts. It's an essential step in the information gathering phase of a security assessment, providing valuable insights into a target's DNS infrastructure.

    ## Usage
    \`\`\`
    /dnsscanner [flags]

    Flags:
    INPUT:
      -target, -t string   Target domain to scan
      -zone-transfer, -z   Test all NS servers for a zone transfer
    \`\`\`

    ## Examples
    \`\`\`
    /dnsscanner -target example.com
    /dnsscanner -target example.com -zone-transfer
    \`\`\`

    **Interaction Methods**
    Interact with DNS Scanner using natural language queries or direct commands starting with "/", followed by the necessary flags to specify the target and options.
  `
}
