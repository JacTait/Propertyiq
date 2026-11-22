export const ACCESS_ERROR_MESSAGES = {
  invalid: "Those details could not be verified. Check the purchase email and licence key, then try again.",
  disabled: "This PropertyIQ licence is no longer active.",
  email_mismatch: "The email address does not match this licence. Use the email from your purchase checkout.",
  activation_limit:
    "This licence has reached its device activation limit. Sign out on another browser or contact support.",
  network: "We could not reach the licence service. Please try again shortly.",
  rate_limited: "Too many attempts. Please wait and try again.",
  tester: "That tester code could not be activated.",
} as const;

export type AccessClientError = keyof typeof ACCESS_ERROR_MESSAGES;
