export interface ChatStarter {
  title: string
  description: string
  chatMessage: string
}

export interface PluginSummary {
  id: number
  name: string
  categories: string[]
  value: PluginID
  icon?: string
  invertInDarkMode?: boolean
  description?: string
  githubRepoUrl?: string
  isInstalled: boolean
  isPremium: boolean
  createdAt: string
  starters: ChatStarter[]
}

export interface Plugin {
  id: PluginID
}

export enum PluginID {
  NONE = "none",
  ENHANCED_SEARCH = "enhanced-search",
  PLUGINS_STORE = "pluginselector",
  // Tools
  WEB_SEARCH = "websearch",
  BROWSER = "browser",
  TERMINAL = "terminal",
  REASON_LLM = "reason-llm",

  // Pentest tools
  SSL_SCANNER = "ssl-scanner",
  DNS_SCANNER = "dns-scanner",
  PORT_SCANNER = "port-scanner",
  WAF_DETECTOR = "waf-detector",
  WHOIS_LOOKUP = "whois-lookup",
  SUBDOMAIN_FINDER = "subdomain-finder",
  CVE_MAP = "cve-map",
  URL_FUZZER = "url-fuzzer",
  WORDPRESS_SCANNER = "wordpress-scanner",
  // Exploit Tools
  SQLI_EXPLOITER = "sqli-exploiter",
  XSS_EXPLOITER = "xss-exploiter"
}

export const Plugins: Record<PluginID, Plugin> = Object.fromEntries(
  Object.values(PluginID).map(id => [id, { id }])
) as Record<PluginID, Plugin>

export const PluginList = Object.values(Plugins)

type PluginUrls = Record<string, string>

export const pluginUrls: PluginUrls = {
  PENTESTGPT: "https://github.com/hackerai-tech/PentestGPT",
  // Pentest tools
  SSL_SCANNER: "https://github.com/drwetter/testssl.sh/",
  DNS_SCANNER: "https://github.com/darkoperator/dnsrecon",
  PORT_SCANNER: "https://github.com/projectdiscovery/naabu",
  WAF_DETECTOR: "https://github.com/EnableSecurity/wafw00f",
  WHOIS_LOOKUP: "https://www.whois.com/whois/",
  SUBDOMAIN_FINDER: "https://github.com/projectdiscovery/subfinder",
  CVE_MAP: "https://github.com/projectdiscovery/cvemap",
  URL_FUZZER: "https://github.com/ffuf/ffuf",
  WORDPRESS_SCANNER: "https://github.com/wpscanteam/wpscan",
  // Exploit Tools
  SQLI_EXPLOITER: "https://github.com/sqlmapproject/sqlmap",
  XSS_EXPLOITER: "https://github.com/hahwul/dalfox"
}
