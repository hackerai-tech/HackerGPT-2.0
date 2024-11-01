import { useEffect } from "react"

const useHotkey = (
  key: string,
  callback: () => void,
  options: { ctrlKey?: boolean; shiftKey?: boolean } = {
    ctrlKey: true,
    shiftKey: true
  }
): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const isMac = /macintosh|mac os x/i.test(navigator.userAgent)
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      if (
        modifierKey &&
        (options.shiftKey ? event.shiftKey : true) &&
        event.key.toLowerCase() === key.toLowerCase()
      ) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [key, callback, options.ctrlKey, options.shiftKey])
}

export default useHotkey
