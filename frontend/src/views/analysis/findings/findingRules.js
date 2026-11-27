/**
 * Module: findingRules
 * Purpose: Presentation rules for findings: severity by finding type, value
 *          masking, and helpers for listing occurrences. Pure functions.
 * Owner: Full Stack team
 */

export const SEVERITY = {
  CRITICAL: { id: 'critical', label: 'Critical' },
  HIGH: { id: 'high', label: 'High' },
  MEDIUM: { id: 'medium', label: 'Medium' },
}

const KEY_MATERIAL_TYPES = new Set(['private_key', 'certificate', 'openssh_private_key'])
const MEDIUM_SEVERITY_TYPES = new Set(['username', 'session'])
const KEY_PREVIEW_CHARS = 16
const MASKED_VALUE_LENGTH = 10
const MASK_CHARACTER = '•'

/**
 * Get the severity of a finding type. Key material is critical,
 * identifiers are medium, everything else (passwords, tokens...) is high.
 * @param {string} findingType
 * @returns {{id: string, label: string}}
 */
export function getSeverityForType(findingType) {
  if (KEY_MATERIAL_TYPES.has(findingType)) return SEVERITY.CRITICAL
  if (MEDIUM_SEVERITY_TYPES.has(findingType)) return SEVERITY.MEDIUM
  return SEVERITY.HIGH
}

/**
 * Mask a secret for the findings table. Key material keeps a readable
 * prefix so it can be told apart; other secrets are fully hidden.
 * @param {{finding_type: string, value: string}} finding
 * @returns {string}
 */
export function buildMaskedValue(finding) {
  if (KEY_MATERIAL_TYPES.has(finding.finding_type)) {
    return finding.value.slice(0, KEY_PREVIEW_CHARS) + '…'
  }
  return MASK_CHARACTER.repeat(MASKED_VALUE_LENGTH)
}

/**
 * Join the distinct non-empty values of a list.
 * @param {(string | null | undefined)[]} values
 * @returns {string} Comma-separated distinct values, or '' if none.
 */
export function buildDistinctList(values) {
  return [...new Set(values.filter(Boolean))].join(', ')
}
