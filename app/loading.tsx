import { IconLoader2 } from "@tabler/icons-react"
import { JSX } from "react"
interface LoadingProps {
  size?: number
}

export default function Loading({ size = 12 }: LoadingProps): JSX.Element {
  const sizeClass = `size-${size}`
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <IconLoader2 className={`mt-4 ${sizeClass} animate-spin`} />
    </div>
  )
}
