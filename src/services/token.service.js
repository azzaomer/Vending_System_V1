/**
 * P2.5: Token Pre-Processing Service
 * * Implements compliance logic (F-1.3.2, F-1.3.4, F-1.3.5) by handling complex token strings.
 * * It detects dual tokens (Key Change + Credit) and separates them into a structured array 
 * for clean presentation by the Front-End (P3.2).
 */

// Key Change Token format often uses a dash (-) or space and is 40 digits long.
// Example: 1234 5678 9012 3456 7890 - 1234 5678 9012 3456 7890
const DUAL_TOKEN_SEPARATOR = ' '; // Assumed standard separator

/**
 * Parses a raw token string from the Hub response into a structured array of tokens.
 * @param {string} rawTokenString - The token string from the Hub (can be single or dual).
 * @returns {Array<{type: 'CREDIT'|'KEY_CHANGE', value: string}>} - A structured array of tokens.
 */
function processToken(rawTokenString) {
    if (!rawTokenString || typeof rawTokenString !== 'string') {
        return [];
    }

    // Standardize whitespace before splitting
    const standardizedString = rawTokenString.trim().replace(/\s+/g, DUAL_TOKEN_SEPARATOR);
    const parts = standardizedString.split(DUAL_TOKEN_SEPARATOR);
    
    // Filter out any empty strings resulting from multiple separators
    const cleanedParts = parts.filter(p => p.length > 0);

    // If there is only one part, it's a standard Credit Token
    if (cleanedParts.length === 1) {
        return [{ 
            type: 'CREDIT', 
            value: cleanedParts[0] 
        }];
    }

    // If there are exactly two parts, we assume it's a Dual Credit/Key Change Token
    if (cleanedParts.length === 2) {
        // F-1.3.3: Key Change Tokens (Key A/B) MUST be displayed FIRST.
        // We assume the first token is the Key Change and the second is the Credit.
        return [
            { type: 'KEY_CHANGE', value: cleanedParts[0] }, // F-1.3.2: First token is the Key Change
            { type: 'CREDIT', value: cleanedParts[1] }      // F-1.3.4: Second token is the Credit Token
        ];
    }
    
    // If the token string has more than 2 parts, we treat it as a single, complex credit token 
    // and let the front-end format it.
    return [{ 
        type: 'CREDIT_COMPLEX', 
        value: rawTokenString 
    }];
}

module.exports = {
    processToken
};
