/**
 * Centralized timeout configuration for all tests.
 * Adjust these values based on environment (CI may need longer timeouts).
 */
export const TIMEOUTS = {
  // Navigation timeouts
  navigation: 15000,      // Waiting for page navigation
  pageLoad: 30000,        // Full page load

  // Element timeouts
  elementVisible: 5000,   // Waiting for element to be visible
  elementHidden: 5000,    // Waiting for element to disappear
  animation: 1000,        // Waiting for animations

  // API timeouts
  apiResponse: 10000,     // Waiting for API response
  apiRetry: 3000,         // Delay between API retries

  // Auth timeouts
  login: 10000,           // Login process
  logout: 5000,           // Logout process

  // Test-specific
  fileUpload: 30000,      // File upload operations
  aiGeneration: 60000,    // AI card generation (slow)
} as const;

// CI environments may need longer timeouts
export const CI_TIMEOUT_MULTIPLIER = process.env.CI ? 1.5 : 1;

export function getTimeout(key: keyof typeof TIMEOUTS): number {
  return TIMEOUTS[key] * CI_TIMEOUT_MULTIPLIER;
}

// Export individual timeouts for convenience
export const {
  navigation: NAVIGATION_TIMEOUT,
  pageLoad: PAGE_LOAD_TIMEOUT,
  elementVisible: ELEMENT_VISIBLE_TIMEOUT,
  apiResponse: API_RESPONSE_TIMEOUT,
} = TIMEOUTS;
