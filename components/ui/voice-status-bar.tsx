import React, { FC, useRef, useState, useEffect, useCallback } from "react"
import {
  IconX,
  IconCheck,
  IconPlayerRecord,
  IconLoader
} from "@tabler/icons-react"
import { toast } from "sonner"

interface VoiceStatusBarProps {
  isListening: boolean
  isSpeechToTextLoading: boolean
  isEnhancedMenuOpen: boolean
  onStop: () => void
  onCancel: () => void
}

const VoiceStatusBar: FC<VoiceStatusBarProps> = ({
  isListening,
  isSpeechToTextLoading,
  isEnhancedMenuOpen,
  onStop,
  onCancel
}) => {
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    if (isListening && !isRecording) {
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsRecording(false)
    }
  }, [isListening])

  const handleRecordingChange = useCallback(
    (stop: boolean) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsRecording(false)
      stop ? onStop() : onCancel()
    },
    [onStop, onCancel]
  )

  useEffect(() => {
    if (recordingTime >= 300) {
      handleRecordingChange(true)
      toast.info("Maximum recording time reached (5 minutes)")
    }
  }, [recordingTime, handleRecordingChange])

  // Move the early return after all hooks
  if (!isListening && !isSpeechToTextLoading) return null

  const baseClasses = `bg-secondary ${
    isEnhancedMenuOpen ? "mt-3" : "mt-0"
  } flex min-h-[96px] items-center rounded-xl px-4 py-3`

  if (isSpeechToTextLoading) {
    return (
      <div className={`${baseClasses} justify-center`}>
        <IconLoader className="animate-spin text-gray-500" size={24} />
        <span className="ml-2 text-sm text-gray-500">Transcribing...</span>
      </div>
    )
  }

  return (
    <div className={`${baseClasses} justify-between`}>
      <IconX
        className="bg-primary text-secondary cursor-pointer rounded p-1 hover:opacity-50"
        onClick={() => handleRecordingChange(false)}
        size={28}
      />
      <div className="flex-1">
        <div className="mx-2">
          {isRecording && (
            <div className="flex items-center justify-center">
              <IconPlayerRecord
                className="animate-ping text-red-500"
                size={18}
              />
              <span className="ml-2 text-sm text-gray-500">Recording...</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <div className="mr-2 text-sm text-gray-500">
          {formatTime(recordingTime)}
        </div>
        <IconCheck
          className="bg-primary text-secondary cursor-pointer rounded p-1 hover:opacity-50"
          onClick={() => handleRecordingChange(true)}
          size={28}
        />
      </div>
    </div>
  )
}

function formatTime(time: number): string {
  const minutes = Math.floor(time / 60).toString()
  const seconds = (time % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

export default VoiceStatusBar
