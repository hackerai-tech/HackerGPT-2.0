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

export interface DNSScannerParams {
  target: string
  zoneTransfer: boolean
  error?: string
}

export const DNS_SCANNER_DEFAULT_PARAMS: DNSScannerParams = {
  target: "",
  zoneTransfer: false
}

export const DNS_SCANNER_MAX_INPUT_LENGTH = 500
