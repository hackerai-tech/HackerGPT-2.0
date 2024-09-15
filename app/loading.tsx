import { IconLoader2 } from "@tabler/icons-react"

interface LoadingProps {
  size?: number
}

export default function Loading({ size = 12 }: LoadingProps) {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <IconLoader2 className={`size- mt-4${size} animate-spin`} />
    </div>
  )
}
