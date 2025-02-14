import { GlobalState } from "@/components/utility/global-state"
import { Providers } from "@/components/utility/providers"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "./globals.css"
import { GlobalAlertDialog } from "./global-alert-dialog"
import { PluginProvider } from "@/components/chat/chat-hooks/PluginProvider"
import { createClient } from "@/lib/supabase/server"
import { UIState } from "@/components/utility/ui-state"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "PentestGPT"
const APP_DEFAULT_TITLE = "PentestGPT: AI-Powered Penetration Testing Assistant"
const APP_TITLE_TEMPLATE = "%s"
const APP_DESCRIPTION =
  "PentestGPT provides advanced AI and integrated tools to help security teams conduct comprehensive penetration tests effortlessly. Scan, exploit, and analyze web applications, networks, and cloud environments with ease and precision, without needing expert skills."

interface RootLayoutProps {
  children: ReactNode
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  metadataBase: new URL("https://pentestgpt.ai"),
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  keywords: [
    "pentestgpt",
    "pentest ai",
    "penetration testing ai",
    "pentesting ai"
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "https://pentestgpt.ai/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "PentestGPT"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "https://pentestgpt.ai/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "PentestGPT"
      }
    ]
  }
}

export const viewport: Viewport = {
  themeColor: "#000000"
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const getUser = async () => {
    "use server"

    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    return user
  }

  const user = await getUser()

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className + " h-full"}>
        <Providers attribute="class" defaultTheme="dark">
          <Toaster richColors position="top-center" duration={3000} />
          <div className="bg-background text-foreground flex h-dvh flex-col items-center overflow-x-auto">
            {user ? (
              <PluginProvider>
                <GlobalState>
                  <UIState>{children}</UIState>
                </GlobalState>
              </PluginProvider>
            ) : (
              children
            )}
          </div>
          <GlobalAlertDialog />
        </Providers>
      </body>
    </html>
  )
}
