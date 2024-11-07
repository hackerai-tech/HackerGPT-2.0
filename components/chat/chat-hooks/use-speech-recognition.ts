import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const useSpeechRecognition = (
  onTranscriptChange: (transcript: string) => void
) => {
  // State declarations
  const [isListening, setIsListening] = useState(false)
  const [hasMicAccess, setHasMicAccess] = useState(false)
  const [isSpeechToTextLoading, setIsSpeechToTextLoading] = useState(false)
  const [isRequestingMicAccess, setIsRequestingMicAccess] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  // Refs
  const audioChunksRef = useRef<Blob[]>([])
  const isCanceledRef = useRef(false)
  const recordingStartTimeRef = useRef<number>(0)

  // Constants
  const MIN_RECORDING_DURATION = 1000 // 1 second minimum

  // Add prevIsListeningRef
  const prevIsListeningRef = useRef<boolean>(false)

  // Add new ref to track recording state
  const isRecordingRef = useRef<boolean>(false)

  // Helper function to check browser compatibility
  const getSupportedMimeType = useCallback((): string | null => {
    const isAppleDevice = /iPad|iPhone|iPod|Mac/.test(navigator.userAgent)

    // For Apple devices
    if (isAppleDevice) {
      const appleMimeTypes = [
        "audio/mp4;codecs=mp4a",
        "audio/mp4",
        "audio/mpeg",
        "audio/aac"
      ]

      for (const type of appleMimeTypes) {
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            return type
          }
        } catch {
          continue
        }
      }
    }

    // For other devices
    const mimeTypes = [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/wav"
    ]

    for (const type of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          return type
        }
      } catch {
        continue
      }
    }

    return null
  }, [])

  // Check if the browser supports the required MIME types
  const hasSupportedMimeType = Boolean(getSupportedMimeType())

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data)
    }
  }, [])

  const handleStop = useCallback(async () => {
    if (!isRecordingRef.current) return

    const recordingDuration = Date.now() - recordingStartTimeRef.current

    if (isCanceledRef.current || recordingDuration < MIN_RECORDING_DURATION) {
      audioChunksRef.current = []
      isCanceledRef.current = false
      isRecordingRef.current = false
      if (recordingDuration < MIN_RECORDING_DURATION) {
        toast.error(
          "Recording too short. Please hold the microphone button longer."
        )
      }
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      toast.error("No supported audio format found for your browser.")
      return
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
      const fileSizeInMB = audioBlob.size / (1024 * 1024)

      if (fileSizeInMB > 24) {
        toast.error(
          "Audio file size exceeds the maximum allowed size of 24 MB."
        )
        return
      }

      if (fileSizeInMB === 0) {
        toast.error("No audio data recorded. Please try again.")
        return
      }

      setIsSpeechToTextLoading(true)
      const formData = new FormData()
      formData.append(
        "audioFile",
        audioBlob,
        `speech.${mimeType.split("/")[1].split(";")[0]}`
      )

      const response = await fetch("/api/chat/speech-to-text", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to transcribe audio")
      }

      onTranscriptChange(data.text)
    } catch (error) {
      console.error("Speech to text error:", error)
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Failed to process audio"}`
      )
    } finally {
      isRecordingRef.current = false
      setIsSpeechToTextLoading(false)
      audioChunksRef.current = []
      if (mediaRecorder?.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaRecorder, onTranscriptChange, getSupportedMimeType])

  const requestMicAccess = useCallback(() => {
    setIsRequestingMicAccess(true)
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setHasMicAccess(true)
        setIsListening(true)
      })
      .catch(() => {
        setHasMicAccess(false)
      })
      .finally(() => {
        setIsRequestingMicAccess(false)
      })
  }, [])

  const startRecording = useCallback(() => {
    if (!hasMicAccess || isRecordingRef.current) {
      return
    }

    isRecordingRef.current = true
    audioChunksRef.current = []
    recordingStartTimeRef.current = Date.now()

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100 // Add stable sample rate
        }
      })
      .then(stream => {
        const mimeType = getSupportedMimeType()
        if (!mimeType) {
          throw new Error("No supported audio format found")
        }

        try {
          const recorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 128000
          })

          recorder.ondataavailable = handleDataAvailable
          recorder.onstop = handleStop
          recorder.onerror = event => {
            console.error("MediaRecorder error:", event)
            isRecordingRef.current = false
            setIsListening(false)
            toast.error("Recording failed. Please try again.")
          }

          recorder.start(100)
          setMediaRecorder(recorder)
          setIsListening(true)
        } catch (err) {
          isRecordingRef.current = false
          throw new Error("Failed to start recording")
        }
      })
      .catch(err => {
        console.error("MediaRecorder error:", err)
        isRecordingRef.current = false
        setIsListening(false)
        toast.error(`Microphone error: ${err.message}`)
        setHasMicAccess(false)
      })
  }, [handleDataAvailable, handleStop, getSupportedMimeType, hasMicAccess])

  useEffect(() => {
    if (isListening && !prevIsListeningRef.current) {
      startRecording()
    } else if (!isListening && mediaRecorder) {
      mediaRecorder.stop()
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      }
      setMediaRecorder(null)
    }

    prevIsListeningRef.current = isListening

    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach(track => track.stop())
        }
        setMediaRecorder(null)
      }
    }
  }, [isListening, startRecording, mediaRecorder])

  const startListening = () => setIsListening(true)
  const cancelListening = () => {
    isCanceledRef.current = true
    setIsListening(false)
  }

  return {
    isListening,
    setIsListening,
    hasSupportedMimeType,
    hasMicAccess,
    isRequestingMicAccess,
    requestMicAccess,
    startListening,
    cancelListening,
    isSpeechToTextLoading
  }
}

export default useSpeechRecognition
