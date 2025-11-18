/**
 * Utility functions for managing referral codes in localStorage
 */

const REFERRAL_STORAGE_KEY = 'deltalytix_referral_code'

/**
 * Get referral code from localStorage
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY)
  } catch (error) {
    console.error('Error reading referral code from localStorage:', error)
    return null
  }
}

/**
 * Store referral code in localStorage
 */
export function storeReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code)
  } catch (error) {
    console.error('Error storing referral code in localStorage:', error)
  }
}

/**
 * Clear referral code from localStorage
 */
export function clearReferralCode(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing referral code from localStorage:', error)
  }
}

/**
 * Get referral code from URL params or localStorage
 * If found in URL, stores it in localStorage
 */
export function getReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  
  // First check URL params
  const urlParams = new URLSearchParams(window.location.search)
  const refFromUrl = urlParams.get('ref') || urlParams.get('referral')
  
  if (refFromUrl) {
    // Store it for future use
    storeReferralCode(refFromUrl)
    return refFromUrl
  }
  
  // Fall back to localStorage
  return getStoredReferralCode()
}
