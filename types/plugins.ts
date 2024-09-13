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
  CVEMAP = "cvemap",
  SUBFINDER = "subfinder",
  ENHANCED_SEARCH = "enhancedsearch",
  PLUGINS_STORE = "pluginselector",
  // Tools
  PORTSCANNER = "portscanner",
  WHOIS = "whois",
  WAFDETECTOR = "wafdetector",
  // Default tools
  WEB_SEARCH = "websearch",
  // PYTHON = "python",
  BROWSER = "browser",
  TERMINAL = "terminal",
  // IMAGE_GENERATOR = "imagegenerator"

  // Pentest tools
  SQLI_EXPLOITER = "sqliexploiter",
  SSL_SCANNER = "sslscanner",
  DNS_SCANNER = "dnsscanner"
}

export const Plugins: Record<PluginID, Plugin> = Object.fromEntries(
  Object.values(PluginID).map(id => [id, { id }])
) as Record<PluginID, Plugin>

export const PluginList = Object.values(Plugins)

type PluginUrls = Record<string, string>

export const pluginUrls: PluginUrls = {
  PENTESTGPT: "https://github.com/hackerai-tech/PentestGPT",
  CVEMAP: "https://github.com/projectdiscovery/cvemap",
  SUBFINDER: "https://github.com/projectdiscovery/subfinder",
  // Tools
  PORTSCANNER: "https://github.com/projectdiscovery/naabu",
  WHOIS: "https://www.whois.com/whois/",
  WAFDETECTOR: "https://github.com/EnableSecurity/wafw00f",
  // Pentest tools
  SQLI_EXPLOITER: "https://github.com/sqlmapproject/sqlmap",
  SSL_SCANNER: "https://github.com/drwetter/testssl.sh/",
  DNS_SCANNER: "https://github.com/darkoperator/dnsrecon"
}
