export interface ChatStarter {
  title: string
  description: string
  chatMessage: string
}

export interface PluginSummary {
  id: number
  name: string
  selectorName: string
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
  SSLSCANNER = "sslscanner",
  WHOIS = "whois",
  WAFDETECTOR = "wafdetector",
  DNSSCANNER = "dnsscanner",
  // Default tools
  WEB_SEARCH = "websearch",
  // PYTHON = "python",
  BROWSER = "browser",
  TERMINAL = "terminal"
  // IMAGE_GENERATOR = "imagegenerator"
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
  SSLSCANNER: "https://github.com/drwetter/testssl.sh/",
  WHOIS: "https://www.whois.com/whois/",
  WAFDETECTOR: "https://github.com/EnableSecurity/wafw00f",
  DNSSCANNER: "https://github.com/darkoperator/dnsrecon"
}
