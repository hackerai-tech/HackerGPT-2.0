import { encode, decode } from "gpt-tokenizer"

const MAX_TOKENS = 32000
const INITIAL_TOKENS = 1000

export async function streamTerminalOutput(
  terminalStream: ReadableStream<Uint8Array>,
  enqueueChunk: (chunk: string) => void
): Promise<string> {
  const reader = terminalStream.getReader()
  let terminalOutput = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = new TextDecoder().decode(value)
    terminalOutput += chunk
    enqueueChunk(chunk)
  }
  return terminalOutput
}

export function reduceTerminalOutput(output: string): string {
  const tokens = encode(output)
  if (tokens.length > MAX_TOKENS) {
    const initial = tokens.slice(0, INITIAL_TOKENS)
    const remaining = tokens.slice(-(MAX_TOKENS - INITIAL_TOKENS))
    return decode(initial) + "\n...\n" + decode(remaining)
  }
  return output
}
