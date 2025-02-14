import { Metadata } from "next"

export const metadata: Metadata = {
  title: "PentestGPT"
}

export default function ChatLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
