export interface DataPartValue {
  citations?: string[]
  ragUsed?: boolean
  ragId?: string | null
  isFragment?: boolean
  type?: string
  content?: string
  finishReason?: string
  sandboxType?: "persistent-sandbox" | "temporary-sandbox"
  // Thinking
  elapsed_secs?: number
}
