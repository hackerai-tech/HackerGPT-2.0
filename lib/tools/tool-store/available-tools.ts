import { PluginID, pluginUrls, PluginSummary } from "@/types/plugins"

export const availablePlugins: PluginSummary[] = [
  {
    id: 0,
    name: "No plugin selected",
    value: PluginID.NONE,
    categories: [],
    isInstalled: false,
    isPremium: false,
    createdAt: "2023-01-01",
    starters: [
      // {
      //   title: "Explain How To",
      //   description: "identify and exploit XSS vulnerabilities",
      //   chatMessage: "Explain how to identify and exploit XSS vulnerabilities."
      // },
      // {
      //   title: "Explain How To",
      //   description: "identify information disclosure vulnerabilities",
      //   chatMessage:
      //     "Explain how to identify information disclosure vulnerabilities."
      // },
      // {
      //   title: "Provide General Methodology",
      //   description: "for file upload vulnerabilities",
      //   chatMessage:
      //     "Provide General Methodology for file upload vulnerabilities."
      // },
      // {
      //   title: "Provide Techniques",
      //   description: "to bypass rate limit",
      //   chatMessage: "Provide techniques to bypass rate limit."
      // }
    ]
  },
  {
    id: 1,
    name: "Enhanced Search",
    value: PluginID.ENHANCED_SEARCH,
    categories: ["utils"],
    icon: "https://cdn-icons-png.flaticon.com/128/11751/11751689.png",
    invertInDarkMode: true,
    description:
      "Enhances the model with curated PentestGPT knowledge, including popular guides, techniques, and tools",
    githubRepoUrl: pluginUrls.PENTESTGPT,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-07-26",
    starters: [
      // {
      //   title: "What are Some Ways",
      //   description: "to bypass payment process?",
      //   chatMessage: "What are some ways to bypass payment process?"
      // },
      // {
      //   title: "Explain the OWASP Top 10",
      //   description: "and how to test for them",
      //   chatMessage: "Explain the OWASP Top 10 and how to test for them."
      // },
      // {
      //   title: "Describe Common Techniques",
      //   description: "for exploiting server-side request forgery",
      //   chatMessage:
      //     "Describe common techniques for exploiting server-side request forgery."
      // },
      // {
      //   title: "List Popular Vulnerabel",
      //   description: "ports to exploit",
      //   chatMessage: "List popular vulnerabel ports to exploit."
      // }
    ]
  },
  {
    id: 2,
    name: "Terminal",
    value: PluginID.TERMINAL,
    categories: ["utils"],
    icon: "https://cdn-icons-png.flaticon.com/128/5576/5576886.png",
    invertInDarkMode: true,
    description:
      "Execute Bash commands, install and configure tools, and perform advanced pentesting tasks",
    githubRepoUrl: pluginUrls.PENTESTGPT,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-10-04",
    starters: []
  },
  {
    id: 3,
    name: "Artifacts",
    value: PluginID.ARTIFACTS,
    categories: ["utils"],
    icon: "https://cdn-icons-png.flaticon.com/128/11676/11676347.png",
    invertInDarkMode: true,
    description:
      "Write and run code to process data, run analysis, and produce data visualizations in real time",
    githubRepoUrl: pluginUrls.ARTIFACTS,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-10-04",
    starters: [
      {
        title: "Chart the OWASP Top 10:2021",
        description:
          "vulnerabilities with percentages of affected applications",
        chatMessage:
          "Chart the OWASP Top 10:2021 vulnerabilities with percentages of affected applications using Python"
      },
      {
        title: "Create XSS Demo",
        description: "with Next.js vulnerable component",
        chatMessage:
          "Create a Next.js component that demonstrates a reflected XSS vulnerability with user input. Include both the vulnerable and secure versions."
      },
      {
        title: "Encode this XSS Payload",
        description: "using Python base64 and URL encoding",
        chatMessage:
          "Encode this XSS payload using Python base64 and URL encoding: <img src=x onerror=alert(document.cookie)>"
      },
      {
        title: "Get Headers",
        description: "from pentestgpt.ai",
        chatMessage: "Get headers from pentestgpt.ai"
      }
    ]
  },
  {
    id: 9,
    name: "CVE Map",
    value: PluginID.CVE_MAP,
    categories: ["utils"],
    icon: "https://cdn-icons-png.flaticon.com/128/4337/4337922.png",
    invertInDarkMode: true,
    description: "Navigate the CVE jungle with ease",
    githubRepoUrl: pluginUrls.CVE_MAP,
    isInstalled: false,
    isPremium: false,
    createdAt: "2024-03-13",
    starters: [
      {
        title: "Provide Me With",
        description: "the latest CVEs with the severity of critical",
        chatMessage:
          "Provide me with the latest CVEs with the severity of critical."
      },
      {
        title: "Provide Information About",
        description: "CVE-2024-23897 (critical LFI in Jenkins)",
        chatMessage:
          "Provide information about CVE-2024-23897 (critical LFI in Jenkins)."
      },
      {
        title: "CVEMap Help",
        description: "How does the CVEMap plugin work?",
        chatMessage: "How does the CVEMap plugin work?"
      }
    ]
  },
  // Recon tools id 10-19
  {
    id: 10,
    name: "Subdomain Finder",
    categories: ["recon"],
    value: PluginID.SUBDOMAIN_FINDER,
    icon: "https://cdn-icons-png.flaticon.com/128/3138/3138297.png",
    invertInDarkMode: true,
    description: "Discover subdomains of a domain",
    githubRepoUrl: pluginUrls.SUBDOMAIN_FINDER,
    isInstalled: false,
    isPremium: false,
    createdAt: "2024-02-27",
    starters: [
      {
        title: "Start Subdomain Discovery",
        description: "for bugcrowd.com",
        chatMessage: "Start subdomain discovery for bugcrowd.com"
      },
      {
        title: "Scan For Active-Only",
        description: "subdomains of hackthebox.com",
        chatMessage: "Scan for active-only subdomains of hackthebox.com"
      },
      {
        title: "Scan For Subdomains",
        description: "of intigriti.com including their host IPs",
        chatMessage:
          "Scan for subdomains of intigriti.com including their host IPs."
      },
      {
        title: "Subfinder Help",
        description: "How does the Subfinder plugin work?",
        chatMessage: "How does the Subfinder plugin work?"
      }
    ]
  },
  {
    id: 11,
    name: "Port Scanner",
    value: PluginID.PORT_SCANNER,
    categories: ["recon"],
    icon: "https://cdn-icons-png.flaticon.com/128/7338/7338907.png",
    invertInDarkMode: true,
    description: "Detect open ports and fingerprint services",
    githubRepoUrl: pluginUrls.PORT_SCANNER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-06-29",
    starters: [
      {
        title: "Perform Light Port Scan",
        description: "on hackerone.com (top 100 ports)",
        chatMessage: "Perform a light port scan on hackerone.com"
      },
      {
        title: "Scan Specific Ports",
        description: "80, 443, 8080 on hackerone.com and subdomains",
        chatMessage:
          "Scan ports 80, 443, and 8080 on hackerone.com and its subdomains: api.hackerone.com, docs.hackerone.com, resources.hackerone.com, gslink.hackerone.com"
      },
      {
        title: "Conduct Deep Port Scan",
        description: "on hackerone.com (top 1000 ports)",
        chatMessage: "Conduct a deep port scan on hackerone.com"
      },
      {
        title: "Port Scanner Help",
        description: "How does the Port Scanner plugin work?",
        chatMessage: "How does the Port Scanner plugin work?"
      }
    ]
  },
  {
    id: 12,
    name: "WAF Detector",
    value: PluginID.WAF_DETECTOR,
    categories: ["recon"],
    icon: "https://cdn-icons-png.flaticon.com/128/6993/6993518.png",
    invertInDarkMode: true,
    description: "Fingerprint the Web Application Firewall behind target app",
    githubRepoUrl: pluginUrls.WAF_DETECTOR,
    isInstalled: false,
    isPremium: false,
    createdAt: "2024-08-03",
    starters: [
      {
        title: "Detect the WAF",
        description: "used by hackerone.com",
        chatMessage: "Detect the WAF used by hackerone.com"
      },
      {
        title: "WAF Detector Help",
        description: "How does the WAF Detector plugin work?",
        chatMessage: "How does the WAF Detector plugin work?"
      }
    ]
  },
  {
    id: 13,
    name: "Whois Lookup",
    categories: ["recon"],
    value: PluginID.WHOIS_LOOKUP,
    icon: "https://cdn-icons-png.flaticon.com/128/15226/15226100.png",
    invertInDarkMode: true,
    description:
      "Retrieve ownership and registration details for domains and IP addresses",
    githubRepoUrl: pluginUrls.WHOIS_LOOKUP,
    isInstalled: false,
    isPremium: false,
    createdAt: "2024-07-28",
    starters: [
      {
        title: "Domain Whois Lookup",
        description: "for owasp.org",
        chatMessage: "Perform a Whois lookup for owasp.org"
      },
      {
        title: "Check Registration Info",
        description: "of hackerone.com",
        chatMessage: "Check the registration information for hackerone.com"
      },
      {
        title: "IP Address Whois Lookup",
        description: "for 8.8.8.8",
        chatMessage: "Perform a Whois lookup for IP address 8.8.8.8"
      },
      {
        title: "Whois Lookup Help",
        description: "How does the Whois Lookup plugin work?",
        chatMessage: "How does the Whois Lookup plugin work?"
      }
    ]
  },
  {
    id: 14,
    name: "URL Fuzzer",
    value: PluginID.URL_FUZZER,
    categories: ["recon"],
    icon: "https://cdn-icons-png.flaticon.com/128/10423/10423265.png",
    invertInDarkMode: true,
    description: "Discover hidden files and directories",
    githubRepoUrl: pluginUrls.URL_FUZZER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-09-17",
    starters: [
      {
        title: "Quick Directory Scan",
        description: "of google.com using common.txt",
        chatMessage:
          "Perform a quick directory scan on google.com using the common.txt wordlist, showing only 200 OK responses"
      },
      {
        title: "Enumerate Subdomains",
        description: "of google.com using subdomains wordlist",
        chatMessage:
          "Enumerate subdomains of FUZZ.google.com using subdomains wordlist, showing only 200 OK responses"
      },
      {
        title: "URL Fuzzer Help",
        description: "How does the URL Fuzzer plugin work?",
        chatMessage: "How does the URL Fuzzer plugin work?"
      }
    ]
  },
  // Vulnerability scanners id 20-29
  {
    id: 20,
    name: "WordPress Scanner",
    value: PluginID.WORDPRESS_SCANNER,
    categories: ["vuln-scanners"],
    icon: "https://cdn-icons-png.flaticon.com/128/49/49006.png",
    invertInDarkMode: true,
    description:
      "Scan WordPress for outdated plugins, core vulnerabilities, user enumeration and more",
    githubRepoUrl: pluginUrls.WORDPRESS_SCANNER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-09-19",
    starters: [
      {
        title: "Perform Basic WordPress Scan",
        description: "on example.com",
        chatMessage: "Perform a basic WordPress scan on example.com"
      },
      {
        title: "Enumerate themes",
        description: "for example.com",
        chatMessage: "Check for vulnerable plugins for example.com"
      },
      {
        title: "Enumerate WordPress Users",
        description: "for example.com",
        chatMessage:
          "Enumerate WordPress users on example.com and assess user enumeration vulnerability"
      },
      {
        title: "WordPress Scanner Help",
        description: "How does the WordPress Scanner plugin work?",
        chatMessage: "How does the WordPress Scanner plugin work?"
      }
    ]
  },
  {
    id: 21,
    name: "DNS Scanner",
    value: PluginID.DNS_SCANNER,
    categories: ["vuln-scanners"],
    icon: "https://cdn-icons-png.flaticon.com/128/1183/1183697.png",
    invertInDarkMode: true,
    description:
      "Perform DNS recon and discover misconfigurations in DNS servers",
    githubRepoUrl: pluginUrls.DNS_SCANNER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-08-05",
    starters: [
      {
        title: "Enumerate DNS Records",
        description: "for owasp.org",
        chatMessage: "Enumerate DNS Records for owasp.org"
      },
      {
        title: "Attempt Zone Transfer",
        description: "on tryhackme.com",
        chatMessage: "Attempt Zone Transfer on tryhackme.com"
      },
      {
        title: "DNS Scanner Help",
        description: "How does the DNS Scanner plugin work?",
        chatMessage: "How does the DNS Scanner plugin work?"
      }
    ]
  },
  {
    id: 22,
    name: "SSL/TLS Scanner",
    value: PluginID.SSL_SCANNER,
    categories: ["vuln-scanners"],
    icon: "https://cdn-icons-png.flaticon.com/128/1034/1034605.png",
    invertInDarkMode: true,
    description:
      "Find SSL/TLS issues like POODLE, Heartbleed, DROWN, ROBOT, etc",
    githubRepoUrl: pluginUrls.SSL_SCANNER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-07-11",
    starters: [
      {
        title: "Perform Quick SSL/TLS Scan",
        description: "of hackerone.com (port 443 only)",
        chatMessage: "Perform a quick SSL/TLS scan on hackerone.com"
      },
      {
        title: "Conduct a Deep SSL/TLS Scan",
        description: "on bugcrowd.com (top 1000 ports)",
        chatMessage: "Conduct a deep SSL/TLS scan on bugcrowd.com"
      },
      {
        title: "Scan SSL/TLS on Ports",
        description: "443 and 8443 of intigriti.com",
        chatMessage: "Scan SSL/TLS on ports 443 and 8443 of intigriti.com"
      },
      {
        title: "SSL/TLS Scanner Help",
        description: "How does the SSL/TLS Scanner plugin work?",
        chatMessage: "How does the SSL/TLS Scanner plugin work?"
      }
    ]
  },
  // Exploit Tools id 30-39
  {
    id: 30,
    name: "SQLi Exploiter",
    value: PluginID.SQLI_EXPLOITER,
    categories: ["exploit"],
    icon: "https://cdn-icons-png.flaticon.com/128/6843/6843633.png",
    invertInDarkMode: true,
    description: "Exploit SQL injection in web apps to extract data",
    githubRepoUrl: pluginUrls.SQLI_EXPLOITER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-07-18",
    starters: [
      {
        title: "Perform Basic SQLi Scan",
        description: "on testphp.vulnweb.com search page",
        chatMessage:
          "Perform a basic SQLi scan on http://testphp.vulnweb.com/search.php?test=1"
      },
      {
        title: "Conduct Advanced SQLi Analysis",
        description: "using all techniques with elevated risk",
        chatMessage:
          "Conduct an advanced SQLi analysis on http://testphp.vulnweb.com/search.php?test=1 using all techniques and risk level 2"
      },
      {
        title: "Execute Deep SQLi Scan",
        description: "with crawling and evasion techniques",
        chatMessage:
          "Execute a deep SQLi scan on http://testphp.vulnweb.com/search.php?test=1 with crawling enabled, using space2comment evasion, and level 3 testing"
      },
      {
        title: "SQLi Exploiter Help",
        description: "How does the SQLi Exploiter plugin work?",
        chatMessage: "How does the SQLi Exploiter plugin work?"
      }
    ]
  },
  {
    id: 31,
    name: "XSS Exploiter",
    value: PluginID.XSS_EXPLOITER,
    categories: ["exploit"],
    icon: "https://cdn-icons-png.flaticon.com/128/14702/14702433.png",
    invertInDarkMode: true,
    description: "Exploit XSS in real life-attacks, extract cookies, and data",
    githubRepoUrl: pluginUrls.XSS_EXPLOITER,
    isInstalled: false,
    isPremium: true,
    createdAt: "2024-09-25",
    starters: [
      {
        title: "Find XSS Vulnerabilities",
        description: "on testphp.vulnweb.com",
        chatMessage:
          "Find XSS vulnerabilities on http://testphp.vulnweb.com/listproducts.php"
      },
      {
        title: "XSS Exploiter Help",
        description: "How does the XSS Exploiter plugin work?",
        chatMessage: "How does the XSS Exploiter plugin work?"
      }
    ]
  },
  {
    id: 99,
    name: "Plugins Store",
    categories: [],
    value: PluginID.PLUGINS_STORE,
    isInstalled: false,
    isPremium: false,
    createdAt: "2023-01-01",
    starters: []
  }
]
