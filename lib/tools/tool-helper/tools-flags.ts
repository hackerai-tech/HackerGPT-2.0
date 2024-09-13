export type WhoisLookupParams = {
  target: string
  error?: string
}

export const WHOIS_DEFAULT_PARAMS: WhoisLookupParams = {
  target: ""
}

export const WHOIS_MAX_INPUT_LENGTH = 500

export type WafDetectorParams = {
  target: string
  error?: string
}

export const WAF_DETECTOR_DEFAULT_PARAMS: WafDetectorParams = {
  target: ""
}

export const WAF_DETECTOR_MAX_INPUT_LENGTH = 500
