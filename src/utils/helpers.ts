// Utility functions for the backend

/**
 * Generate a random string of specified length
 */
export const generateRandomString = (length: number): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Sanitize and validate subdomain
 */
export const sanitizeSubdomain = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};

/**
 * Validate if a string is a valid subdomain
 */
export const isValidSubdomain = (subdomain: string): boolean => {
  if (!subdomain || subdomain.length === 0) return false;
  if (subdomain.length > 50) return false;

  const validSubdomainRegex = /^[a-z0-9-]+$/;
  return validSubdomainRegex.test(subdomain);
};

/**
 * Format date to ISO string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Get current timestamp
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Check if a string is a valid emoji (basic check)
 */
export const isValidEmoji = (emoji: string): boolean => {
  if (!emoji || emoji.length === 0) return false;
  // Basic emoji validation - can be enhanced with more sophisticated checks
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(emoji) || emoji.length <= 4; // Allow short strings as fallback
};
