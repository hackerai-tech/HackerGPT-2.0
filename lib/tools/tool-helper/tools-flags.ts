export type WhoisLookupParams = {
  target: string
  error?: string
}

export const WHOIS_DEFAULT_PARAMS: WhoisLookupParams = {
  target: ""
}

export const WHOIS_MAX_INPUT_LENGTH = 500
