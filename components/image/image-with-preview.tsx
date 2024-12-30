import dynamic from "next/dynamic"
import { forwardRef, ImgHTMLAttributes, useState } from "react"

const DynamicFilePreview = dynamic(() => import("../ui/file-preview"), {
  ssr: false
})

const ImageWithPreview = forwardRef<
  HTMLImageElement,
  ImgHTMLAttributes<HTMLImageElement>
>(({ src, ...props }, ref) => {
  const [showImagePreview, setShowImagePreview] = useState(false)

  return (
    <>
      <img
        ref={ref}
        onClick={() => setShowImagePreview(true)}
        className="w-1/2 rounded-md"
        src={src}
        {...props}
      />
      {showImagePreview && (
        <DynamicFilePreview
          type="image"
          item={{
            messageId: "",
            path: "",
            base64: "",
            url: src as string,
            file: null
          }}
          isOpen={showImagePreview}
          onOpenChange={(isOpen: boolean) => {
            setShowImagePreview(isOpen)
          }}
        />
      )}
    </>
  )
})

ImageWithPreview.displayName = "ImageWithPreview"

export { ImageWithPreview }
