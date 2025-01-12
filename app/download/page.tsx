import { Metadata } from "next"
import Image from "next/image"
import { IconArrowUpRight } from "@tabler/icons-react"

export const metadata: Metadata = {
  title: "Download PentestGPT",
  description:
    "Download PentestGPT desktop app and experience advanced AI-powered penetration testing with a native desktop experience.",
  openGraph: {
    title: "Download PentestGPT Desktop App",
    description:
      "Get PentestGPT on your desktop for enhanced penetration testing capabilities.",
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BUCKET_URL}/pentestgpt-mac-app.png`,
        width: 1200,
        height: 630,
        alt: "PentestGPT Desktop Application"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Download PentestGPT Desktop App",
    description:
      "Get PentestGPT on your desktop for enhanced penetration testing capabilities.",
    images: [`${process.env.NEXT_PUBLIC_BUCKET_URL}/pentestgpt-mac-app.png`]
  }
}

const BUCKET_URL = process.env.NEXT_PUBLIC_BUCKET_URL

const DOWNLOAD_OPTIONS = [
  {
    platform: "macOS",
    description: "For macOS 14+ with Apple Silicon",
    filename: "PentestGPT.dmg",
    showAsterisk: true
  },
  {
    platform: "Linux",
    description: "For AMD64 architecture only",
    filename: "PentestGPT.AppImage",
    showAsterisk: false
  }
  // {
  //   platform: "Windows",
  //   description: "Compatible with Windows 10 and above",
  //   filename: "PentestGPT.exe",
  //   showAsterisk: false
  // },
]

interface DownloadOptionProps {
  platform: string
  description: string
  filename: string
  showAsterisk: boolean
  isFirst?: boolean
}

function DownloadOption({
  platform,
  description,
  filename,
  showAsterisk,
  isFirst
}: DownloadOptionProps) {
  return (
    <div className={`pt-8 ${isFirst ? "first:pt-0" : ""}`}>
      <div className="flex flex-col items-start">
        <h3 className="text-foreground text-2xl font-semibold">{platform}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
        <a
          href={`${BUCKET_URL}/${filename}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 group mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
        >
          Download for {platform}
          {showAsterisk ? "*" : ""}
          <IconArrowUpRight
            className="transition-transform group-hover:translate-x-0.5"
            size={16}
          />
        </a>
      </div>
    </div>
  )
}

export default function DownloadPage() {
  return (
    <div className="from-background to-background/80 min-h-screen bg-gradient-to-b py-16">
      {/* Header Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Download PentestGPT
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
            Get PentestGPT on desktop.
          </p>
        </div>
      </div>

      {/* Main Image */}
      <div className="mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="from-primary/10 to-secondary/10 overflow-hidden rounded-2xl bg-gradient-to-br shadow-xl">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={`${BUCKET_URL}/pentestgpt-mac-app.png`}
              alt="PentestGPT Desktop Application"
              fill
              priority
              className="object-cover object-bottom"
              quality={100}
            />
          </div>
        </div>
      </div>

      {/* Download Options */}
      <div className="mx-auto mt-16 max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="divide-border space-y-8 divide-y">
          {DOWNLOAD_OPTIONS.map((option, index) => (
            <DownloadOption
              key={option.platform}
              {...option}
              isFirst={index === 0}
            />
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-muted-foreground mx-auto mb-24 mt-16 max-w-3xl px-4 text-center text-sm">
        <p className="text-xs italic">
          *The macOS desktop app is only available for macOS 14+ with Apple
          Silicon (M1 or better).
          <br />
          The Linux app is compatible with AMD64 architecture only.
          <br />
          Access to the app may depend on your company&apos;s IT policies.
        </p>

        {/* Learn More Link */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://help.hackerai.co/en/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/90 group inline-flex items-center gap-2 transition-colors"
          >
            Learn more about the desktop app
            <IconArrowUpRight
              className="transition-transform group-hover:translate-x-0.5"
              size={16}
            />
          </a>
        </div>
      </div>
    </div>
  )
}
